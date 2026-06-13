'use client';

import { useState, useCallback } from 'react';
import { CameraPreview } from '@/components/CameraPreview';
import { StatusIndicator } from '@/components/StatusIndicator';
import { ConversationPanel } from '@/components/ConversationPanel';
import { Controls } from '@/components/Controls';
import { DebugPanel } from '@/components/DebugPanel';
import { PermissionGate } from '@/components/PermissionGate';
import { useCamera } from '@/hooks/useCamera';
import { useOrchestrator } from '@/hooks/useOrchestrator';
import type { ConversationState, CostStats, Message } from '@/modules/shared/types';

export default function Home() {
  const camera = useCamera();
  const orchestrator = useOrchestrator();
  const [textInput, setTextInput] = useState('');

  // Compute effective state
  const effectiveState: ConversationState = camera.stream ? orchestrator.state : 'idle';

  const handleStart = useCallback(async () => {
    await camera.startCamera();
  }, [camera]);

  const handleStop = useCallback(() => {
    camera.stopCamera();
    orchestrator.setError(null);
  }, [camera, orchestrator]);

  const handleRetry = useCallback(() => {
    camera.startCamera();
  }, [camera]);

  const handleSubmitText = useCallback((text: string) => {
    // Add user message locally, orchestration handled by parent
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: Date.now(),
      source: 'web-speech',
    };
    orchestrator.handleEvent({ type: 'user_message', payload: userMsg });
  }, [orchestrator]);

  return (
    <PermissionGate cameraError={camera.error} onRetry={handleRetry}>
      <div className="flex flex-col h-screen w-full max-w-md mx-auto relative">
        {/* Camera — full height background */}
        <div className="absolute inset-0 z-0">
          <CameraPreview stream={camera.stream} className="w-full h-full" />
        </div>

        {/* Status bar */}
        <div className="relative z-10 flex justify-center pt-4">
          <StatusIndicator state={effectiveState} />
        </div>

        {/* Conversation — floating overlay */}
        <div className="relative z-10 flex-1 flex items-end pb-4 px-3">
          <div className="w-full bg-black/50 backdrop-blur rounded-2xl border border-white/10 overflow-hidden">
            <div className="max-h-[40vh]">
              <ConversationPanel messages={orchestrator.messages} />
            </div>
            <div className="p-3 border-t border-white/10">
              <Controls
                state={effectiveState}
                isLowPower={camera.isLowPower}
                onStart={handleStart}
                onStop={handleStop}
                onSubmitText={handleSubmitText}
              />
            </div>
          </div>
        </div>

        {/* Debug panel */}
        <DebugPanel
          costStats={orchestrator.costStats}
        />

        {/* Error toast */}
        {orchestrator.error && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-red-500/90 backdrop-blur text-white text-sm shadow-lg">
            {orchestrator.error}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
