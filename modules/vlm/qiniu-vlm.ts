import type { VLMResponse, ConversationTurn } from '../shared/types';
import { VLMTimeoutError, VLMAPIError } from '../shared/errors';

export async function callQiniuVLM(
  image: string,
  question: string,
  history?: ConversationTurn[],
): Promise<VLMResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/vlm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, question, history }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new VLMAPIError();
    }

    const data: { answer: string; tokensUsed?: number } = await response.json();

    return {
      answer: data.answer,
      source: 'qiniu',
      tokensUsed: data.tokensUsed,
    };
  } catch (err: unknown) {
    if (err instanceof VLMAPIError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new VLMTimeoutError();
    }
    // Network or other errors also surface as API errors
    throw new VLMAPIError();
  } finally {
    clearTimeout(timeoutId);
  }
}
