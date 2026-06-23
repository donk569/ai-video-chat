import { NextResponse } from 'next/server';

const MAX_TEXT_LENGTH = 500;

export async function POST(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: '不支持的请求方法', code: 405 }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误', code: 400 }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '缺少合成文本', code: 400 }, { status: 400 });
  }

  let { text } = body as Record<string, unknown>;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: '缺少合成文本', code: 400 }, { status: 400 });
  }

  // Truncate text > 500 characters
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  const ttsUrl = process.env.QINIU_TTS_URL;
  const apiKey = process.env.QINIU_API_KEY;

  if (!ttsUrl || !apiKey) {
    return NextResponse.json({ error: 'TTS 服务未配置', code: 500 }, { status: 500 });
  }

  try {
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      let msg = 'TTS 合成失败';
      try {
        const errBody: unknown = await response.json();
        if (errBody && typeof errBody === 'object' && 'message' in errBody && typeof (errBody as Record<string, unknown>).message === 'string') {
          msg = (errBody as Record<string, string>).message;
        }
      } catch { /* ignore parse errors */ }
      return NextResponse.json({ error: msg, code: response.status }, { status: response.status });
    }

    // Forward audio/mpeg binary
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const message = isTimeout ? 'TTS 请求超时' : 'TTS 服务异常';
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
