'use client';

import { useRef, useState, useCallback } from 'react';
import type { ConversationState, ConversationEvent, CostStats, Message } from '@/modules/shared/types';

export function useOrchestrator() {
  const [state, setState] = useState<ConversationState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [costStats, setCostStats] = useState<CostStats>({ cloudCalls: 0, tokensUsed: 0, estimatedCostRMB: 0 });
  const [error, setError] = useState<string | null>(null);
  const eventsRef = useRef<ConversationEvent[]>([]);

  const handleEvent = useCallback((event: ConversationEvent) => {
    eventsRef.current.push(event);

    switch (event.type) {
      case 'state_change':
        if (typeof event.payload === 'string') {
          setState(event.payload as ConversationState);
        }
        break;
      case 'user_message':
      case 'assistant_message':
        if (event.payload && typeof event.payload === 'object') {
          setMessages((prev) => [...prev, event.payload as Message]);
        }
        break;
      case 'error':
        if (typeof event.payload === 'string') {
          setError(event.payload);
        }
        break;
      case 'cost_update':
        if (event.payload && typeof event.payload === 'object') {
          setCostStats(event.payload as CostStats);
        }
        break;
    }
  }, []);

  return { state, messages, costStats, error, handleEvent, setState, setMessages, setError };
}
