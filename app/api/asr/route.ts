import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: '不支持的请求方法', code: 405 }, { status: 405 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '请求格式错误', code: 400 }, { status: 400 });
  }

  const audioFile = formData.get('audio');
  if (!audioFile || !(audioFile instanceof Blob) || audioFile.size === 0) {
    return NextResponse.json({ error: '缺少音频文件', code: 400 }, { status: 400 });
  }

  const asrUrl = process.env.QINIU_ASR_URL;
  const apiKey = process.env.QINIU_API_KEY;

  if (!asrUrl || !apiKey) {
    return NextResponse.json({ error: 'ASR 服务未配置', code: 500 }, { status: 500 });
  }

  const qiniuForm = new FormData();
  qiniuForm.append('audio', audioFile);

  try {
    const response = await fetch(asrUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: qiniuForm,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      let msg = 'ASR 识别失败';
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
      return NextResponse.json({ error: 'ASR 响应格式异常', code: 502 }, { status: 502 });
    }
    const d = data as Record<string, unknown>;
    return NextResponse.json({
      text: typeof d.text === 'string' ? d.text : '',
      confidence: typeof d.confidence === 'number' ? d.confidence : undefined,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const message = isTimeout ? 'ASR 请求超时' : 'ASR 服务异常';
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
