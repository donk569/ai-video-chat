import type { VLMQuery, VLMResponse } from '../shared/types';

export class LocalVLM {
  private timeoutMs: number;

  constructor(config?: { timeoutMs?: number }) {
    this.timeoutMs = config?.timeoutMs ?? 5000;
  }

  async query(input: VLMQuery): Promise<VLMResponse | null> {
    if (!this.isSupported()) {
      return null;
    }

    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), this.timeoutMs);
    });

    const inference = this.runInference(input);

    return Promise.race([inference, timeout]);
  }

  async preload(): Promise<void> {
    // Dummy preload — in production this loads Transformers.js model
  }

  isSupported(): boolean {
    // Transformers.js not available by default in browser
    return false;
  }

  private async runInference(_input: VLMQuery): Promise<VLMResponse | null> {
    // Transformers.js inference would run here.
    // Since the model is not loaded in browser by default, this promise never resolves.
    // The timeout in query() handles the fallback.
    return new Promise(() => {});
  }
}
