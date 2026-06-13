import type { VLMResponse } from '../shared/types';

export class AnswerCache {
  private store: Map<string, VLMResponse>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100) {
    this.store = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): VLMResponse | null {
    const entry = this.store.get(key);
    if (entry !== undefined) {
      this.hits++;
      // Promote to most-recently-used: delete and re-insert
      this.store.delete(key);
      this.store.set(key, entry);
      return entry;
    }
    this.misses++;
    return null;
  }

  set(key: string, response: VLMResponse): void {
    if (this.store.has(key)) {
      // Update existing: remove old, add at end
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict least-recently-used (first key inserted)
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
    this.store.set(key, response);
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
