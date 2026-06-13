'use client';

import type { ConversationState } from '@/modules/shared/types';

interface ControlsProps {
  state: ConversationState;
  isLowPower: boolean;
  onStart: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
}

export function Controls({ state, isLowPower, onStart, onStop, onSubmitText }: ControlsProps) {
  const isActive = state !== 'idle' && state !== 'error';

  const handleTextSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('text-input') as HTMLInputElement;
    if (input.value.trim()) {
      onSubmitText(input.value.trim());
      input.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Text input */}
      <form onSubmit={handleTextSubmit} className="flex gap-2">
        <input
          name="text-input"
          type="text"
          placeholder="输入文字提问…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-white/30 transition-colors"
          disabled={!isActive && state !== 'idle'}
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm hover:bg-white/20 transition-colors"
        >
          发送
        </button>
      </form>

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-center">
        {!isActive ? (
          <button
            onClick={onStart}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            开始对话
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-8 py-3 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-colors"
          >
            停止
          </button>
        )}

        {isLowPower && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            低功耗
          </span>
        )}
      </div>
    </div>
  );
}
