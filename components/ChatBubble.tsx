'use client';

import type { Message } from '@/modules/shared/types';

interface ChatBubbleProps {
  message: Message;
}

const SOURCE_LABELS: Record<string, string> = {
  'web-speech': 'Web 语音',
  qiniu: '云端',
  cache: '缓存',
  'local-model': '本地模型',
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        isUser
          ? 'bg-blue-500 text-white rounded-br-md'
          : 'bg-white/10 backdrop-blur text-white rounded-bl-md border border-white/10'
      }`}>
        {message.frameDataUrl && (
          <img
            src={message.frameDataUrl}
            alt="画面"
            className="w-24 h-18 object-cover rounded-lg mb-2 opacity-80"
          />
        )}
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            isUser ? 'bg-blue-400/50' : 'bg-white/10'
          }`}>
            {SOURCE_LABELS[message.source] ?? message.source}
          </span>
          <span className="text-[10px] opacity-50">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
