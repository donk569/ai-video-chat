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
    throw new ASRAPIError('语音识别网络异常');
  }

  if (!response.ok) {
    let msg = '语音识别服务暂时不可用';
    try {
      const errData = await response.json();
      if (errData?.error) msg = String(errData.error);
    } catch {
      msg = `ASR API 返回 ${response.status}`;
    }
    throw new ASRAPIError(msg);
  }

  const data = (await response.json()) as { text: string; confidence?: number };

  return {
    text: data.text ?? '',
    confidence: data.confidence,
    source: 'qiniu' as const,
    latencyMs: Date.now() - startTime,
  };
}
