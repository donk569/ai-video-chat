import type {
  ConversationState,
  ConversationEvent,
  CostStats,
  Message,
  AudioChunk,
  CompressedFrame,
  ConversationTurn,
} from '../shared/types';
import { CONFIG } from '../shared/config';
import { StateMachine } from './state-machine';
import { runPipeline, type PipelineDeps } from './pipeline';
import { PowerSaver } from './power-saver';
import type { CameraPipeline } from '../camera';
import type { AudioCapture } from '../audio';
import type { SpeechRecognizer } from '../asr';
import type { VisionLanguageModel } from '../vlm';
import type { TextToSpeech } from '../tts';

export interface OrchestratorDeps {
  camera: CameraPipeline;
  audio: AudioCapture;
  asr: SpeechRecognizer;
  vlm: VisionLanguageModel;
  tts: TextToSpeech;
}

export class Orchestrator {
  private deps: OrchestratorDeps;
  private stateMachine: StateMachine;
  private powerSaver: PowerSaver;
  private messages: Message[] = [];
  private history: ConversationTurn[] = [];
  private costStats: CostStats = { cloudCalls: 0, tokensUsed: 0, estimatedCostRMB: 0 };
  private eventListeners: Array<(event: ConversationEvent) => void> = [];
  private started = false;

  constructor(deps: OrchestratorDeps) {
    this.deps = deps;
    this.stateMachine = new StateMachine();
    this.powerSaver = new PowerSaver(CONFIG.powerSaver.idleTimeoutMs);

    this.powerSaver.onWake(() => {
      this.emit({ type: 'state_change', payload: this.stateMachine.getState() });
    });
  }

  async start(): Promise<void> {
    if (this.started) return;

    const stream = await this.deps.camera.start();
    this.deps.camera.getStream = () => stream;

    await this.deps.audio.start();
    this.powerSaver.setTarget(this.deps.camera);

    this.deps.audio.onChunk((chunk: AudioChunk) => {
      if (chunk.hasSpeech) {
        this.handleVoiceChunk(chunk);
      }
    });

    this.started = true;
  }

  stop(): void {
    this.deps.camera.stop();
    this.deps.audio.stop();
    this.powerSaver.stop();
    this.stateMachine.reset();
    this.started = false;
  }

  getState(): ConversationState {
    return this.stateMachine.getState();
  }

  onEvent(callback: (event: ConversationEvent) => void): void {
    this.eventListeners.push(callback);
  }

  getCostStats(): CostStats {
    return { ...this.costStats };
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  submitText(text: string): void {
    const frame = this.deps.camera.captureFrame();
    this.handleTextInput(text, frame);
  }

  setLowPower(enabled: boolean): void {
    this.deps.camera.setLowPower(enabled);
  }

  private async handleVoiceChunk(chunk: AudioChunk): Promise<void> {
    try {
      this.stateMachine.transition('listening');
      this.powerSaver.activity();

      this.stateMachine.transition('thinking');

      const frame = this.deps.camera.captureFrame();
      if (!frame) {
        this.stateMachine.transition('idle');
        return; // no frame change, skip
      }

      const result = await runPipeline(this.deps, chunk, frame, this.history);

      this.history.push({ question: '', answer: result.message.text }); // question text from ASR is inside pipeline
      if (this.history.length > 10) {
        this.history = this.history.slice(-10);
      }

      // Update cost
      this.costStats.cloudCalls += result.costDelta.cloudCalls ?? 0;
      this.costStats.tokensUsed += result.costDelta.tokensUsed ?? 0;
      this.costStats.estimatedCostRMB += result.costDelta.estimatedCostRMB ?? 0;

      this.messages.push(result.message);
      if (this.messages.length > 100) {
        this.messages = this.messages.slice(-50);
      }

      this.stateMachine.transition('speaking');

      this.emit({ type: 'assistant_message', payload: result.message });
      this.emit({ type: 'cost_update', payload: this.getCostStats() });

      this.stateMachine.transition('idle');
    } catch (err) {
      this.stateMachine.forceError();
      this.emit({
        type: 'error',
        payload: err instanceof Error ? err.message : '未知错误',
      });
    }
  }

  private async handleTextInput(text: string, frame: CompressedFrame | null): Promise<void> {
    if (!frame) {
      frame = this.deps.camera.captureFrame() ?? {
        dataUrl: '',
        width: 0,
        height: 0,
        sizeBytes: 0,
        timestamp: Date.now(),
      };
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: Date.now(),
      source: 'web-speech',
    };
    this.messages.push(userMessage);
    this.emit({ type: 'user_message', payload: userMessage });

    try {
      this.stateMachine.transition('thinking');

      const vlmResult = await this.deps.vlm.query({
        image: frame.dataUrl,
        question: text,
      });

      this.costStats.cloudCalls += vlmResult.source === 'qiniu' ? 1 : 0;
      this.costStats.tokensUsed += vlmResult.tokensUsed ?? 0;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: vlmResult.answer,
        timestamp: Date.now(),
        source: vlmResult.source,
      };
      this.messages.push(assistantMessage);

      await this.deps.tts.speak(vlmResult.answer);

      this.emit({ type: 'assistant_message', payload: assistantMessage });
      this.emit({ type: 'cost_update', payload: this.getCostStats() });

      this.stateMachine.transition('idle');
    } catch (err) {
      this.stateMachine.forceError();
      this.emit({
        type: 'error',
        payload: err instanceof Error ? err.message : '未知错误',
      });
    }
  }

  private emit(event: ConversationEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
