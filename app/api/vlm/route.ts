import { NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB

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
    return NextResponse.json({ error: '缺少图片或问题', code: 400 }, { status: 400 });
  }

  const { image, question } = body as Record<string, unknown>;

  if (typeof image !== 'string' || image.length === 0 || typeof question !== 'string' || question.length === 0) {
    return NextResponse.json({ error: '缺少图片或问题', code: 400 }, { status: 400 });
  }

  // Check oversized image (> 500KB in raw base64 string length)
  if (image.length > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: '图片过大，请压缩后重试（最大 500KB）', code: 413 },
      { status: 413 },
    );
  }

  const vlmUrl = process.env.QINIU_VLM_URL;
  const apiKey = process.env.QINIU_API_KEY;

  if (!vlmUrl || !apiKey) {
    return NextResponse.json({ error: 'VLM 服务未配置', code: 500 }, { status: 500 });
  }

  try {
    const response = await fetch(vlmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ image, question }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      let msg = 'VLM 识别失败';
      try {
        const errBody: unknown = await response.json();
        if (errBody && typeof errBody === 'object' && 'message' in errBody && typeof (errBody as Record<string, unknown>).message === 'string') {
          msg = (errBody as Record<string, string>).message;
        }
      } catch { /* ignore parse errors */ }
      return NextResponse.json({ error: msg, code: response.status }, { status: response.status });
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'VLM 响应格式异常', code: 502 }, { status: 502 });
    }
    const d = data as Record<string, unknown>;
    return NextResponse.json({
      answer: typeof d.answer === 'string' ? d.answer : '',
      tokensUsed: typeof d.tokensUsed === 'number' ? d.tokensUsed : undefined,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const message = isTimeout ? 'VLM 请求超时' : 'VLM 服务异常';
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
