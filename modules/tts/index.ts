import type { TTSResult, TTSConfig } from '../shared/types';
import { CONFIG } from '../shared/config';
import { WebSpeechSynthesizer } from './web-speech';
import { callQiniuTTS } from './qiniu-tts';

export class TextToSpeech {
  private webSpeech: WebSpeechSynthesizer;
  private fallbackEnabled: boolean;
  private endCallbacks: Array<() => void> = [];

  constructor(config: Partial<TTSConfig> = {}) {
    this.webSpeech = new WebSpeechSynthesizer({
      lang: config.lang ?? CONFIG.tts.lang,
      rate: config.rate ?? CONFIG.tts.rate,
      pitch: config.pitch ?? CONFIG.tts.pitch,
    });
    this.fallbackEnabled = config.fallbackEnabled ?? CONFIG.tts.fallbackEnabled;
  }

  async speak(text: string): Promise<TTSResult> {
    try {
      const result = await this.webSpeech.speak(text);
      this.fireEnd();
      return result;
    } catch {
      if (!this.fallbackEnabled) {
        throw new Error('TTS 不可用');
      }
      const result = await callQiniuTTS(text);
      this.fireEnd();
      return result;
    }
  }

  stop(): void {
    this.webSpeech.stop();
  }

  isSupported(): boolean {
    return this.webSpeech.isSupported();
  }

  isSpeaking(): boolean {
    return this.webSpeech.isSpeaking();
  }

  onEnd(callback: () => void): void {
    this.endCallbacks.push(callback);
  }

  private fireEnd(): void {
    for (const cb of this.endCallbacks) {
      cb();
    }
  }
}

export { WebSpeechSynthesizer } from './web-speech';
export { callQiniuTTS } from './qiniu-tts';
