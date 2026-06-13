import { requestMicrophone, startRecording, stopAll } from './capture';
import { AudioChunker, computeRMS, detectSpeech } from './vad';
import { CONFIG } from '@/modules/shared/config';
import type { AudioConfig, AudioChunk } from '@/modules/shared/types';

export class AudioCapture {
  private config: AudioConfig;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private stopRecordingFn: (() => void) | null = null;
  private chunker: AudioChunker;
  private speaking: boolean = false;
  private started: boolean = false;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...CONFIG.audio, ...config };
    this.chunker = new AudioChunker({
      vadThreshold: this.config.vadThreshold,
      silenceTimeoutMs: this.config.silenceTimeoutMs,
      chunkDurationMs: this.config.chunkDurationMs,
      sampleRate: this.config.sampleRate,
    });
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const { stream, context } = await requestMicrophone({
      sampleRate: { ideal: this.config.sampleRate },
      echoCancellation: true,
      noiseSuppression: true,
    });

    this.stream = stream;
    this.context = context;

    this.stopRecordingFn = startRecording(
      context,
      stream,
      (data: Float32Array) => {
        this.chunker.addData(data);
        const rms = computeRMS(data);
        this.speaking = detectSpeech(rms, this.config.vadThreshold);
      },
    );
  }

  onChunk(callback: (chunk: AudioChunk) => void): void {
    this.chunker.onChunk(callback);
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  stop(): void {
    this.started = false;
    this.speaking = false;

    if (this.stopRecordingFn) {
      this.stopRecordingFn();
      this.stopRecordingFn = null;
    }

    this.chunker.flush();
    this.chunker.reset();

    if (this.stream && this.context) {
      stopAll(this.stream, this.context);
      this.stream = null;
      this.context = null;
    }
  }
}
