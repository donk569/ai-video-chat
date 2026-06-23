'use client';

import { useRef, useCallback, useState } from 'react';

type SR = SpeechRecognition;

export function useVoiceInput(onResult: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const start = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    const SRClass = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as typeof SpeechRecognition | undefined;
    if (!SRClass || recognitionRef.current) return;

    const recognition = new SRClass();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = true;

    // Track when audio is detected (non-standard props, use any cast)
    const rec = recognition as unknown as Record<string, unknown>;
    rec.onaudiostart = () => setSpeaking(true);
    rec.onaudioend = () => setSpeaking(false);
    rec.onsoundstart = () => setSpeaking(true);
    rec.onsoundend = () => setSpeaking(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setSpeaking(false);
      // Collect final results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal && result[0]) {
          onResult(result[0].transcript);
        }
      }
    };

    recognition.onerror = () => setSpeaking(false);
    recognition.onend = () => {
      setSpeaking(false);
      // Auto-restart for continuous listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Browser may throw if already started
    }
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setSpeaking(false);
  }, []);

  const isSupported = typeof window !== 'undefined' &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition ??
       (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

  return { start, stop, speaking, isSupported };
}
