import type { ASRResult, ASRConfig, AudioChunk } from '@/modules/shared/types';
import { WebSpeechRecognizer } from './web-speech';
import { callQiniuASR } from './qiniu-asr';
import { CONFIG } from '@/modules/shared/config';

export class SpeechRecognizer {
  private webSpeech: WebSpeechRecognizer;
  private fallbackEnabled: boolean;

  constructor(config?: Partial<ASRConfig>) {
    this.webSpeech = new WebSpeechRecognizer({ lang: config?.lang ?? CONFIG.asr.lang });
    this.fallbackEnabled = config?.fallbackEnabled ?? CONFIG.asr.fallbackEnabled;
  }

  async recognize(chunk: AudioChunk): Promise<ASRResult> {
    if (this.webSpeech.isSupported()) {
      const result = await this.webSpeech.recognize(chunk);
      if (result !== null) {
        return result;
      }
    }

    if (!this.fallbackEnabled) {
      throw new Error('Web Speech recognition failed and fallback is disabled');
    }

    return callQiniuASR(chunk.blob);
  }

  abort(): void {
    this.webSpeech.abort();
  }

  isSupported(): boolean {
    return this.webSpeech.isSupported();
  }
}
