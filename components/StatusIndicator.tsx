'use client';

import type { ConversationState } from '@/modules/shared/types';

interface StatusIndicatorProps {
  state: ConversationState;
}

const STATE_CONFIG: Record<ConversationState, { label: string; color: string; pulse: boolean }> = {
  idle: { label: '就绪', color: 'bg-gray-400', pulse: false },
  listening: { label: '正在聆听…', color: 'bg-green-500', pulse: true },
  thinking: { label: '思考中…', color: 'bg-blue-500', pulse: true },
  speaking: { label: '正在播报', color: 'bg-yellow-500', pulse: true },
  error: { label: '出错了', color: 'bg-red-500', pulse: false },
};

export function StatusIndicator({ state }: StatusIndicatorProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color} ${config.pulse ? 'animate-ping' : ''}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      <span>{config.label}</span>
    </div>
  );
}
