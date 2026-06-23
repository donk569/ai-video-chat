import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Not allowed', code: 405 }, { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 400 }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question : '';
  if (!question) {
    return NextResponse.json({ error: 'Question required', code: 400 }, { status: 400 });
  }

  const vlmUrl = process.env.QINIU_VLM_URL!;
  const apiKey = process.env.QINIU_API_KEY!;
  const model = process.env.QINIU_TEXT_MODEL ?? 'deepseek-v3';

  if (!vlmUrl || !apiKey) {
    return NextResponse.json({ error: 'Service not configured', code: 500 }, { status: 500 });
  }

  try {
    const res = await fetch(vlmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是AI视觉对话助手。用中文自然回答，简洁友好，两句话以内。不要读任何符号、emoji、URL。' },
          { role: 'user', content: question },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ error: txt || `VLM ${res.status}`, code: res.status }, { status: res.status });
    }

    const data = await res.json() as Record<string, unknown>;
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    return NextResponse.json({
      answer: choices?.[0]?.message?.content ?? '',
      tokensUsed: (data.usage as { total_tokens?: number })?.total_tokens,
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable', code: 500 }, { status: 500 });
  }
}
