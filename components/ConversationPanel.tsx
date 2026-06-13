'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/modules/shared/types';
import { ChatBubble } from './ChatBubble';

interface ConversationPanelProps {
  messages: Message[];
}

export function ConversationPanel({ messages }: ConversationPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto p-4 scrollbar-thin"
      style={{ maxHeight: '60vh' }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          <p>开始说话或输入文字，AI 将回答你的问题</p>
        </div>
      ) : (
        messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))
      )}
    </div>
  );
}
