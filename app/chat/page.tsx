'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CameraPreview } from '@/components/CameraPreview';
import { StatusIndicator } from '@/components/StatusIndicator';
import { ConversationPanel } from '@/components/ConversationPanel';
import { Controls } from '@/components/Controls';
import { DebugPanel } from '@/components/DebugPanel';
import { PermissionGate } from '@/components/PermissionGate';
import { CameraPipeline } from '@/modules/camera';
import { AudioCapture } from '@/modules/audio';
import { SpeechRecognizer } from '@/modules/asr';
import { VisionLanguageModel } from '@/modules/vlm';
import { TextToSpeech } from '@/modules/tts';
import { Orchestrator } from '@/modules/orchestrator';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { ConversationState, CostStats, Message } from '@/modules/shared/types';

export default function Home() {
  const [state, setState] = useState<ConversationState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [costStats, setCostStats] = useState<CostStats>({ cloudCalls: 0, tokensUsed: 0, estimatedCostRMB: 0 });
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLowPower, setIsLowPower] = useState(false);
  const [started, setStarted] = useState(false);

  const orchestratorRef = useRef<Orchestrator | null>(null);
  const cameraRef = useRef<CameraPipeline | null>(null);

  const handleStart = useCallback(async () => {
    try {
      setCameraError(null);

      // Create modules
      const camera = new CameraPipeline({});
      const audio = new AudioCapture({});
      const asr = new SpeechRecognizer({ fallbackEnabled: true });
      const vlm = new VisionLanguageModel({ cacheSize: 100, localModelEnabled: true });
      const tts = new TextToSpeech({ fallbackEnabled: true });

      // Create orchestrator
      const orchestrator = new Orchestrator({ camera, audio, asr, vlm, tts });

      orchestrator.onEvent((event) => {
        switch (event.type) {
          case 'state_change':
            if (typeof event.payload === 'string') {
              const newState = event.payload as ConversationState;
              setState(newState);
              // Pause voice recognition while AI is speaking
              if (newState === 'speaking') {
                voice.stop();
              }
            }
            break;
          case 'assistant_message':
          case 'user_message':
            if (event.payload && typeof event.payload === 'object') {
              setMessages((prev) => {
                const next = [...prev, event.payload as Message];
                return next.length > 100 ? next.slice(-50) : next;
              });
            }
            break;
          case 'error':
            {
              const msg = typeof event.payload === 'string' ? event.payload : '未知错误';
              setError(msg);
              // Auto-dismiss after 4s
              setTimeout(() => setError((prev) => (prev === msg ? null : prev)), 4000);
            }
            break;
          case 'cost_update':
            if (event.payload && typeof event.payload === 'object') {
              setCostStats(event.payload as CostStats);
            }
            break;
        }
      });

      // Start the full pipeline
      await orchestrator.start();

      orchestratorRef.current = orchestrator;
      cameraRef.current = camera;
      setStream(camera.getStream());
      setStarted(true);
      // Start browser voice recognition
      if (voice.isSupported) voice.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '启动失败';
      setCameraError(msg);
    }
  }, []);

  const voiceCooldownRef = useRef(0);
  const handleVoiceResult = useCallback((text: string) => {
    if (!orchestratorRef.current) return;
    // Rate limit: max 1 voice query per 3 seconds
    const now = Date.now();
    if (now - voiceCooldownRef.current < 3000) return;
    voiceCooldownRef.current = now;
    // Stop current TTS before processing new input
    orchestratorRef.current.stopTTS();
    setState('thinking');
    orchestratorRef.current.submitText(text);
  }, []);

  const voice = useVoiceInput(handleVoiceResult);

  // When user speaks, interrupt AI TTS
  useEffect(() => {
    if (voice.speaking && orchestratorRef.current) {
      orchestratorRef.current.stopTTS();
    }
  }, [voice.speaking]);

  // When AI finishes speaking, restart voice recognition
  useEffect(() => {
    if (state === 'idle' && started && voice.isSupported) {
      voice.start();
    }
  }, [state, started, voice.isSupported]);

  const handleStop = useCallback(() => {
    voice.stop();
    orchestratorRef.current?.stopTTS();
    orchestratorRef.current?.stop();
    orchestratorRef.current = null;
    cameraRef.current = null;
    setStream(null);
    setStarted(false);
    setState('idle');
    setError(null);
  }, [voice]);

  const handleSubmitText = useCallback((text: string) => {
    if (!orchestratorRef.current) {
      setError('请先点击「开始对话」');
      return;
    }
    // Interrupt current TTS
    orchestratorRef.current.stopTTS();
    orchestratorRef.current.submitText(text);
  }, []);

  const handleRetry = useCallback(() => {
    handleStart();
  }, [handleStart]);

  return (
    <PermissionGate cameraError={cameraError} onRetry={handleRetry}>
      <div className="flex flex-col h-screen w-full max-w-md mx-auto relative">
        {/* Camera — full height background */}
        <div className="absolute inset-0 z-0">
          <CameraPreview stream={stream} className="w-full h-full" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs hover:text-white hover:bg-white/10 transition-all duration-300">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            首页
          </Link>
          <StatusIndicator state={state} />
          <div className="w-16" /> {/* spacer */}
        </div>

        {/* Conversation — compact, transparent, lower half */}
        <div className="relative z-10 flex-1 flex items-end justify-center px-4 pb-2">
          <div className="w-full max-h-[28vh] bg-black/15 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
            <div className="max-h-[28vh] overflow-y-auto p-2">
              <ConversationPanel messages={messages} />
            </div>
          </div>
        </div>

        {/* Controls — always fixed at bottom */}
        <div className="relative z-10 px-3 pb-4 pt-2">
          <div className="bg-black/60 backdrop-blur rounded-2xl border border-white/10 p-3">
            <Controls
              state={state}
              isLowPower={isLowPower}
              isListening={voice.speaking}
              onStart={handleStart}
              onStop={handleStop}
              onSubmitText={handleSubmitText}
            />
          </div>
        </div>

        {/* Debug panel */}
        <DebugPanel costStats={costStats} />

        {/* Error toast */}
        {error && (
          <button
            onClick={() => setError(null)}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-red-500/90 backdrop-blur text-white text-sm shadow-lg hover:bg-red-600 transition-colors cursor-pointer"
          >
            {error}
            <span className="ml-2 opacity-60 text-xs">(点击关闭)</span>
          </button>
        )}
      </div>
    </PermissionGate>
  );
}
