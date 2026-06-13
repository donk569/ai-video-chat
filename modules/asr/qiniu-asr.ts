import type { ASRResult } from '@/modules/shared/types';
import { ASRTimeoutError, ASRAPIError } from '@/modules/shared/errors';
import { CONFIG } from '@/modules/shared/config';

export async function callQiniuASR(audioBlob: Blob): Promise<ASRResult> {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const startTime = Date.now();

  let response: Response;
  try {
    response = await fetch(`${CONFIG.api.baseURL}/asr`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(CONFIG.api.timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    ) {
      throw new ASRTimeoutError();
    }
    throw new ASRAPIError();
  }

  if (!response.ok) {
    throw new ASRAPIError();
  }

  const data = (await response.json()) as { text: string; confidence?: number };

  return {
    text: data.text ?? '',
    confidence: data.confidence,
    source: 'qiniu' as const,
    latencyMs: Date.now() - startTime,
  };
}
