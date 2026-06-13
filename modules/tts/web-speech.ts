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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      utterance.onend = () => resolve({ source: 'web-speech' });
      utterance.onerror = () => reject(null);

      window.speechSynthesis.speak(utterance);
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
