import type { TTSResult } from '../shared/types';

export class WebSpeechSynthesizer {
  private lang: string;
  private rate: number;
  private pitch: number;

  constructor(config?: { lang?: string; rate?: number; pitch?: number }) {
    this.lang = config?.lang ?? 'zh-CN';
    this.rate = config?.rate ?? 1.0;
    this.pitch = config?.pitch ?? 1.0;
  }

  speak(text: string): Promise<TTSResult> {
    return new Promise((resolve, reject) => {
      // Split long text by sentence boundaries to avoid Chrome TTS cutoff
      const sentences = text.match(/[^。！？.!?\n]+[。！？.!?\n]?/g) || [text];
      // Merge very short fragments with neighbors to avoid choppy speech
      const chunks: string[] = [];
      for (const s of sentences) {
        if (chunks.length > 0 && chunks[chunks.length - 1].length + s.length < 100) {
          chunks[chunks.length - 1] += s;
        } else {
          chunks.push(s);
        }
      }

      let idx = 0;
      const speakNext = () => {
        if (idx >= chunks.length) {
          resolve({ source: 'web-speech' });
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[idx++]);
        utterance.lang = this.lang;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.onend = speakNext;
        utterance.onerror = () => reject(null);
        window.speechSynthesis.speak(utterance);
      };
      speakNext();
    });
  }

  stop(): void {
    window.speechSynthesis.cancel();
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }
}
