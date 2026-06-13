import type { TTSResult } from '../shared/types';
import { TTSError } from '../shared/errors';

export async function callQiniuTTS(text: string): Promise<TTSResult> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let msg = 'TTS 合成失败';
    try {
      const errBody: unknown = await response.json();
      if (errBody && typeof errBody === 'object' && 'error' in errBody && typeof (errBody as Record<string, unknown>).error === 'string') {
        msg = (errBody as Record<string, string>).error;
      }
    } catch { /* ignore */ }
    throw new TTSError(msg);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  URL.revokeObjectURL(url);

  return { source: 'qiniu' };
}
