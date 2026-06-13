import type { VLMResponse, ConversationTurn } from '../shared/types';
import { VLMTimeoutError, VLMAPIError } from '../shared/errors';

export async function callQiniuVLM(
  image: string,
  question: string,
  history?: ConversationTurn[],
): Promise<VLMResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s — Vercel hobby limit

  try {
    const response = await fetch('/api/vlm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, question, history }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMsg = `VLM 请求失败 (${response.status})`;
      try {
        const errData = await response.json();
        if (typeof errData?.error === 'string' && errData.error) {
          errorMsg = errData.error;
        }
      } catch { /* use default */ }
      throw new VLMAPIError(errorMsg);
    }

    const data = await response.json() as { answer: string; tokensUsed?: number };

    return {
      answer: data.answer,
      source: 'qiniu',
      tokensUsed: data.tokensUsed,
    };
  } catch (err: unknown) {
    if (err instanceof VLMAPIError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') throw new VLMTimeoutError();
    throw new VLMAPIError(`网络请求失败: ${err instanceof Error ? err.message : '未知'}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
