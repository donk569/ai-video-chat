import { NextResponse } from 'next/server';

function base64UrlEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeQiniuToken(ak: string, sk: string, path: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const signStr = `${path}\n${body}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(sk), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signStr));
  return `Qiniu ${ak}:${base64UrlEncode(sig)}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: '不支持的请求方法', code: 405 }, { status: 405 });
  }

  const asrUrl = process.env.QINIU_ASR_URL;
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;

  if (!asrUrl || !accessKey || !secretKey) {
    return NextResponse.json({ error: 'ASR 服务未配置', code: 500 }, { status: 500 });
  }

  let audioBlob: Blob;
  try {
    const formData = await request.formData();
    const file = formData.get('audio');
    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: '缺少音频文件', code: 400 }, { status: 400 });
    }
    audioBlob = file;
  } catch {
    return NextResponse.json({ error: '请求格式错误', code: 400 }, { status: 400 });
  }

  // Convert audio blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  const body = JSON.stringify({
    audio: {
      data: base64Audio,
      format: 'wav',
      sample_rate: 16000,
    },
    config: {
      language: 'zh',
      enable_itn: true,
    },
  });

  const url = new URL(asrUrl);
  const auth = await makeQiniuToken(accessKey, secretKey, url.pathname, body);

  try {
    const response = await fetch(asrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: errText || `ASR 返回 ${response.status}` },
        { status: response.status },
      );
    }

    const data: Record<string, unknown> = await response.json();
    const result = data.result as { text?: string } | undefined;

    return NextResponse.json({
      text: result?.text ?? '',
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return NextResponse.json(
      { error: isTimeout ? 'ASR 请求超时' : 'ASR 服务异常' },
      { status: 500 },
    );
  }
}
