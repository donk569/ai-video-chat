import type { ASRResult, AudioChunk } from '@/modules/shared/types';

function getSpeechRecognitionConstructor(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as typeof SpeechRecognition | null;
}

export class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private lang: string;

  constructor(config?: { lang?: string }) {
    this.lang = config?.lang ?? 'zh-CN';
  }

  recognize(_chunk: AudioChunk): Promise<ASRResult | null> {
    return new Promise((resolve) => {
      const SR = getSpeechRecognitionConstructor();
      if (!SR) {
        resolve(null);
        return;
      }

      const recognition = new SR();
      this.recognition = recognition;
      recognition.lang = this.lang;
      recognition.interimResults = false;

      const startTime = Date.now();

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        if (results && results.length > 0) {
          const firstResult = results[0];
          if (firstResult && firstResult.length > 0) {
            const best = firstResult[0];
            resolve({
              text: best.transcript,
              confidence: best.confidence,
              source: 'web-speech',
              latencyMs: Date.now() - startTime,
            });
            return;
          }
        }
        resolve(null);
      };

      recognition.onerror = () => {
        resolve(null);
      };

      recognition.onnomatch = () => {
        resolve(null);
      };

      recognition.start();
    });
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
  }

  isSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }
}
