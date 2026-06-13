import type { VLMQuery, VLMResponse } from '../shared/types';
import { AnswerCache } from './cache';
import { LocalVLM } from './local-model';
import { callQiniuVLM } from './qiniu-vlm';
import { CONFIG } from '../shared/config';

export class VisionLanguageModel {
  private cache: AnswerCache;
  private localModel: LocalVLM;
  private localModelEnabled: boolean;

  constructor(config?: { cacheSize?: number; localModelEnabled?: boolean }) {
    this.cache = new AnswerCache(config?.cacheSize ?? CONFIG.vlm.cacheSize);
    this.localModel = new LocalVLM();
    this.localModelEnabled = config?.localModelEnabled ?? CONFIG.vlm.localModelEnabled;
  }

  async query(input: VLMQuery): Promise<VLMResponse> {
    const cacheKey = this.buildCacheKey(input.question, input.image);

    // Tier 1: cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, source: 'cache' as const };
    }

    // Tier 2: local model (best-effort)
    if (this.localModelEnabled) {
      const localResult = await this.localModel.query(input);
      if (localResult) {
        const response: VLMResponse = { ...localResult, source: 'local-model' as const };
        this.cache.set(cacheKey, response);
        return response;
      }
    }

    // Tier 3: Qiniu cloud VLM
    const qiniuResult = await callQiniuVLM(input.image, input.question, input.history);
    const response: VLMResponse = { ...qiniuResult, source: 'qiniu' as const };
    this.cache.set(cacheKey, response);
    return response;
  }

  async preloadModel(): Promise<void> {
    await this.localModel.preload();
  }

  getCacheStats(): { size: number; hitRate: number } {
    const stats = this.cache.getStats();
    return { size: stats.size, hitRate: stats.hitRate };
  }

  clearCache(): void {
    this.cache.clear();
  }

  private buildCacheKey(question: string, imageDataUrl: string): string {
    return `${question}|${imageDataUrl.slice(-40)}`;
  }
}

export { AnswerCache } from './cache';
export { LocalVLM } from './local-model';
export { callQiniuVLM } from './qiniu-vlm';
