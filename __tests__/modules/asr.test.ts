import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ============================================================
// T-ASR02 mock: callQiniuASR — vi.hoisted to work around ESM hoisting
// ============================================================
const { mockCallQiniuASR } = vi.hoisted(() => ({
  mockCallQiniuASR: vi.fn(),
}));

vi.mock('@/modules/asr/qiniu-asr', () => ({
  callQiniuASR: mockCallQiniuASR,
}));

// ============================================================
// SpeechRecognition mock helpers
// ============================================================
const mockStart = vi.fn();
const mockAbort = vi.fn();

class MockSpeechRecognition {
  lang = '';
  interimResults = false;
  continuous = false;
  start = mockStart;
  abort = mockAbort;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onnomatch: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
}

// ============================================================
// Imports
// ============================================================
import { WebSpeechRecognizer } from '@/modules/asr/web-speech';
import { SpeechRecognizer } from '@/modules/asr/index';
import { ASRTimeoutError, ASRAPIError } from '@/modules/shared/errors';
import type { ASRResult, AudioChunk } from '@/modules/shared/types';

const dummyChunk: AudioChunk = {
  blob: new Blob(['test audio'], { type: 'audio/wav' }),
  durationMs: 100,
  hasSpeech: true,
};

function makeResultEvent(transcript: string, confidence: number): unknown {
  return {
    results: {
      0: {
        0: { transcript, confidence },
        length: 1,
        isFinal: true,
      },
      length: 1,
    },
    resultIndex: 0,
  };
}

function getLastMockInstance(): MockSpeechRecognition {
  const len = mockStart.mock.instances.length;
  return mockStart.mock.instances[len - 1] as unknown as MockSpeechRecognition;
}

// ============================================================
// T-ASR01: web-speech.ts
// ============================================================
describe('T-ASR01: web-speech.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  function setupSR(): void {
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
  }

  it('recognize returns ASRResult with correct source on result event', async () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();

    const promise = recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    instance.onresult?.(makeResultEvent('你好世界', 0.95));

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.text).toBe('你好世界');
    expect(result!.confidence).toBe(0.95);
    expect(result!.source).toBe('web-speech');
    expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('recognize returns null on error event', async () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();

    const promise = recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    instance.onerror?.({});

    const result = await promise;
    expect(result).toBeNull();
  });

  it('recognize returns null on nomatch event', async () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();

    const promise = recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    instance.onnomatch?.({});

    const result = await promise;
    expect(result).toBeNull();
  });

  it('passes lang to recognition instance', async () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer({ lang: 'en-US' });

    const promise = recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    expect(instance.lang).toBe('en-US');

    instance.onerror?.({});
    await promise;
  });

  it('defaults lang to zh-CN', () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();
    recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    expect(instance.lang).toBe('zh-CN');
  });

  it('extracts confidence from results', async () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();

    const promise = recognizer.recognize(dummyChunk);
    const instance = getLastMockInstance();
    instance.onresult?.(makeResultEvent('test', 0.8));

    const result = await promise;
    expect(result!.confidence).toBe(0.8);
  });

  it('isSupported returns true when SpeechRecognition exists', () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();
    expect(recognizer.isSupported()).toBe(true);
  });

  it('isSupported returns false when SpeechRecognition does not exist', () => {
    const recognizer = new WebSpeechRecognizer();
    expect(recognizer.isSupported()).toBe(false);
  });

  it('isSupported returns true when webkitSpeechRecognition exists', () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition;
    const recognizer = new WebSpeechRecognizer();
    expect(recognizer.isSupported()).toBe(true);
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('abort calls abort on recognition instance', () => {
    setupSR();
    const recognizer = new WebSpeechRecognizer();

    recognizer.recognize(dummyChunk);
    recognizer.abort();

    expect(mockAbort).toHaveBeenCalledOnce();
  });
});

// ============================================================
// T-ASR02: qiniu-asr.ts
// ============================================================
describe('T-ASR02: qiniu-asr.ts', () => {
  let realCallQiniuASR: typeof import('@/modules/asr/qiniu-asr').callQiniuASR;

  beforeAll(async () => {
    const actual = await vi.importActual<typeof import('@/modules/asr/qiniu-asr')>(
      '@/modules/asr/qiniu-asr',
    );
    realCallQiniuASR = actual.callQiniuASR;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ASRResult with source qiniu on success', async () => {
    const mockJson = vi.fn().mockResolvedValue({ text: '识别结果', confidence: 0.9 });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson });

    const result = await realCallQiniuASR(dummyChunk.blob);
    expect(result.source).toBe('qiniu');
    expect(result.text).toBe('识别结果');
    expect(result.confidence).toBe(0.9);
  });

  it('throws ASRTimeoutError on fetch TimeoutError', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new DOMException('Timeout', 'TimeoutError'),
    );
    await expect(realCallQiniuASR(dummyChunk.blob)).rejects.toThrow(ASRTimeoutError);
  });

  it('throws ASRTimeoutError on fetch AbortError', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new DOMException('Aborted', 'AbortError'),
    );
    await expect(realCallQiniuASR(dummyChunk.blob)).rejects.toThrow(ASRTimeoutError);
  });

  it('throws ASRAPIError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });
    await expect(realCallQiniuASR(dummyChunk.blob)).rejects.toThrow(ASRAPIError);
  });
});

// ============================================================
// T-ASR03: index.ts (SpeechRecognizer)
// ============================================================
describe('T-ASR03: index.ts (SpeechRecognizer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    mockCallQiniuASR.mockReset();
  });

  it('recognize uses Web Speech first', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
    mockCallQiniuASR.mockRejectedValue(new Error('Qiniu should not be called'));

    const sr = new SpeechRecognizer();
    const promise = sr.recognize(dummyChunk);

    const instance = getLastMockInstance();
    instance.onresult?.(makeResultEvent('优先', 0.99));

    const result = await promise;
    expect(result.source).toBe('web-speech');
    expect(mockCallQiniuASR).not.toHaveBeenCalled();
  });

  it('recognize falls back to Qiniu when Web Speech returns null', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
    mockCallQiniuASR.mockResolvedValue({
      text: 'fallback',
      confidence: 0.5,
      source: 'qiniu',
      latencyMs: 100,
    } as ASRResult);

    const sr = new SpeechRecognizer();
    const promise = sr.recognize(dummyChunk);

    const instance = getLastMockInstance();
    instance.onerror?.({});

    const result = await promise;
    expect(result.source).toBe('qiniu');
    expect(mockCallQiniuASR).toHaveBeenCalledOnce();
    expect(mockCallQiniuASR).toHaveBeenCalledWith(dummyChunk.blob);
  });

  it('isSupported delegates to Web Speech', () => {
    // No SpeechRecognition → not supported
    let sr = new SpeechRecognizer();
    expect(sr.isSupported()).toBe(false);

    // Set SpeechRecognition → supported
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
    sr = new SpeechRecognizer();
    expect(sr.isSupported()).toBe(true);
  });

  it('abort delegates', () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;

    const sr = new SpeechRecognizer();
    sr.recognize(dummyChunk);
    sr.abort();

    expect(mockAbort).toHaveBeenCalled();
  });
});
