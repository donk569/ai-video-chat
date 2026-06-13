import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { POST as asrPOST } from '@/app/api/asr/route';
import { POST as vlmPOST } from '@/app/api/vlm/route';
import { POST as ttsPOST } from '@/app/api/tts/route';

// ------ helpers ------

function resetEnv() {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
}

/** Create a minimal Request-like object for route handler testing. */
function mockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'POST',
    ...overrides,
  } as unknown as Request;
}

const MOCK_KEY = 'sk-test-key-do-not-leak';

// ============================================================
// ASR Route
// ============================================================
describe('POST /api/asr', () => {
  beforeEach(() => {
    vi.stubEnv('QINIU_ASR_URL', 'https://qiniu.example.com/asr');
    vi.stubEnv('QINIU_API_KEY', MOCK_KEY);
    global.fetch = vi.fn();
  });
  afterEach(() => resetEnv());

  it('returns 200 with text and confidence on success', async () => {
    (global.fetch as Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ text: '你好世界', confidence: 0.95 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const formData = new FormData();
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'test.wav');

    const req = mockReq({
      formData: () => Promise.resolve(formData),
    });
    const res = await asrPOST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ text: '你好世界', confidence: 0.95 });
  });

  it('returns 400 when no audio file provided', async () => {
    const formData = new FormData(); // empty
    const req = mockReq({ formData: () => Promise.resolve(formData) });
    const res = await asrPOST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('缺少音频文件');
  });

  it('returns 405 for non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = await asrPOST(req);
    expect(res.status).toBe(405);
    const json = await res.json();
    expect(json.error).toContain('不支持的请求方法');
  });

  it('returns 500 when env vars are missing', async () => {
    vi.stubEnv('QINIU_ASR_URL', undefined);
    vi.stubEnv('QINIU_API_KEY', undefined);

    const formData = new FormData();
    formData.append('audio', new Blob(['a'], { type: 'audio/wav' }), 't.wav');
    const req = mockReq({ formData: () => Promise.resolve(formData) });
    const res = await asrPOST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('ASR 服务未配置');
  });

  it('never leaks API key in error responses', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error(`Connection to https://qiniu with key ${MOCK_KEY} failed`));

    const formData = new FormData();
    formData.append('audio', new Blob(['a'], { type: 'audio/wav' }), 't.wav');
    const req = mockReq({ formData: () => Promise.resolve(formData) });
    const res = await asrPOST(req);

    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain(MOCK_KEY);
  });
});

// ============================================================
// VLM Route
// ============================================================
describe('POST /api/vlm', () => {
  beforeEach(() => {
    vi.stubEnv('QINIU_VLM_URL', 'https://qiniu.example.com/vlm');
    vi.stubEnv('QINIU_API_KEY', MOCK_KEY);
    global.fetch = vi.fn();
  });
  afterEach(() => resetEnv());

  it('returns 200 with answer and tokensUsed on success', async () => {
    (global.fetch as Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ answer: '这是一个红苹果', tokensUsed: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const req = mockReq({
      json: () => Promise.resolve({ image: 'base64-fake', question: '这是什么？' }),
    });
    const res = await vlmPOST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ answer: '这是一个红苹果', tokensUsed: 42 });
  });

  it('returns 400 when image or question is missing', async () => {
    const req = mockReq({
      json: () => Promise.resolve({ image: 'base64-fake' }),
    });
    const res = await vlmPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('缺少图片或问题');
  });

  it('returns 400 when question is missing', async () => {
    const req = mockReq({
      json: () => Promise.resolve({ question: 'what?' }),
    });
    const res = await vlmPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('缺少图片或问题');
  });

  it('returns 413 when base64 image exceeds 500KB', async () => {
    const largeImage = 'a'.repeat(500 * 1024 + 1);
    const req = mockReq({
      json: () => Promise.resolve({ image: largeImage, question: 'test' }),
    });
    const res = await vlmPOST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toContain('图片过大');
  });

  it('returns 405 for non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = await vlmPOST(req);
    expect(res.status).toBe(405);
  });

  it('returns 500 when env vars are missing', async () => {
    vi.stubEnv('QINIU_VLM_URL', undefined);
    vi.stubEnv('QINIU_API_KEY', undefined);

    const req = mockReq({
      json: () => Promise.resolve({ image: 'img', question: 'q' }),
    });
    const res = await vlmPOST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('VLM 服务未配置');
  });

  it('never leaks API key in error responses', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error(`Auth ${MOCK_KEY} invalid`));

    const req = mockReq({
      json: () => Promise.resolve({ image: 'img', question: 'q' }),
    });
    const res = await vlmPOST(req);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain(MOCK_KEY);
  });
});

// ============================================================
// TTS Route
// ============================================================
describe('POST /api/tts', () => {
  beforeEach(() => {
    vi.stubEnv('QINIU_TTS_URL', 'https://qiniu.example.com/tts');
    vi.stubEnv('QINIU_API_KEY', MOCK_KEY);
    global.fetch = vi.fn();
  });
  afterEach(() => resetEnv());

  it('returns 200 with audio/mpeg on success', async () => {
    const audioBuffer = new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer;
    (global.fetch as Mock).mockResolvedValueOnce(
      new Response(audioBuffer, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    );

    const req = mockReq({
      json: () => Promise.resolve({ text: '你好世界' }),
    });
    const res = await ttsPOST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
  });

  it('returns 400 when text is empty or missing', async () => {
    const req = mockReq({
      json: () => Promise.resolve({}),
    });
    const res = await ttsPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('缺少合成文本');
  });

  it('truncates text exceeding 500 characters', async () => {
    (global.fetch as Mock).mockResolvedValueOnce(
      new Response(new Uint8Array([0xff, 0xfb]).buffer, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    );

    const longText = 'a'.repeat(600);
    const req = mockReq({
      json: () => Promise.resolve({ text: longText }),
    });
    const res = await ttsPOST(req);
    expect(res.status).toBe(200);

    // Verify truncated text was sent (500 chars max)
    const fetchCallArgs = (global.fetch as Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCallArgs[1].body as string) as { text: string };
    expect(body.text.length).toBe(500);
  });

  it('returns 405 for non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = await ttsPOST(req);
    expect(res.status).toBe(405);
  });

  it('returns 500 when env vars are missing', async () => {
    vi.stubEnv('QINIU_TTS_URL', undefined);
    vi.stubEnv('QINIU_API_KEY', undefined);

    const req = mockReq({
      json: () => Promise.resolve({ text: 'hello' }),
    });
    const res = await ttsPOST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('TTS 服务未配置');
  });

  it('never leaks API key in error responses', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error(`Key ${MOCK_KEY} rejected`));

    const req = mockReq({
      json: () => Promise.resolve({ text: 'test' }),
    });
    const res = await ttsPOST(req);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain(MOCK_KEY);
  });
});
