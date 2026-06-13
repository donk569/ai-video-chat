import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnswerCache } from '@/modules/vlm/cache';
import { LocalVLM } from '@/modules/vlm/local-model';
import { callQiniuVLM } from '@/modules/vlm/qiniu-vlm';
import { VisionLanguageModel } from '@/modules/vlm';
import { VLMTimeoutError, VLMAPIError } from '@/modules/shared/errors';
import type { VLMResponse, VLMQuery, ConversationTurn } from '@/modules/shared/types';

// ============================================================
// Helper factories
// ============================================================

function makeVLMResponse(overrides?: Partial<VLMResponse>): VLMResponse {
  return {
    answer: '测试回答',
    source: 'qiniu',
    tokensUsed: 42,
    ...overrides,
  };
}

function makeVLMQuery(overrides?: Partial<VLMQuery>): VLMQuery {
  return {
    image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA...abcdefghijklmnopqrstuvwxyz0123456789',
    question: '图片里有什么？',
    ...overrides,
  };
}

// ============================================================
// T-V01: AnswerCache
// ============================================================
describe('AnswerCache', () => {
  let cache: AnswerCache;

  beforeEach(() => {
    cache = new AnswerCache();
  });

  it('get returns null on miss', () => {
    expect(cache.get('nonexistent-key')).toBeNull();
  });

  it('set + get returns same response', () => {
    const resp = makeVLMResponse();
    cache.set('key-1', resp);
    expect(cache.get('key-1')).toEqual(resp);
  });

  it('evicts oldest when at capacity', () => {
    const small = new AnswerCache(3);
    const r1 = makeVLMResponse({ answer: 'one' });
    const r2 = makeVLMResponse({ answer: 'two' });
    const r3 = makeVLMResponse({ answer: 'three' });
    const r4 = makeVLMResponse({ answer: 'four' });

    small.set('k1', r1);
    small.set('k2', r2);
    small.set('k3', r3);
    small.set('k4', r4);

    // k1 should be evicted (oldest)
    expect(small.get('k1')).toBeNull();
    expect(small.get('k2')).toEqual(r2);
    expect(small.get('k3')).toEqual(r3);
    expect(small.get('k4')).toEqual(r4);
  });

  it('getStats returns correct hit rate', () => {
    const resp = makeVLMResponse();
    cache.set('a', resp);

    cache.get('a'); // hit
    cache.get('a'); // hit
    cache.get('b'); // miss

    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
  });

  it('clear empties cache', () => {
    cache.set('x', makeVLMResponse());
    cache.set('y', makeVLMResponse());
    cache.get('x'); // 1 hit
    cache.get('z'); // 1 miss

    cache.clear();

    // Verify stats reset immediately after clear
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);

    // Verify entries are gone
    expect(cache.get('x')).toBeNull();
    expect(cache.get('y')).toBeNull();
  });

  it('different keys return different entries', () => {
    const r1 = makeVLMResponse({ answer: 'first' });
    const r2 = makeVLMResponse({ answer: 'second' });

    cache.set('alpha', r1);
    cache.set('beta', r2);

    expect(cache.get('alpha')).toEqual(r1);
    expect(cache.get('beta')).toEqual(r2);
  });

  it('getStats hitRate returns 0 when no requests made', () => {
    const stats = cache.getStats();
    expect(stats.hitRate).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('LRU promotes accessed entries (get reorders)', () => {
    const small = new AnswerCache(2);
    const r1 = makeVLMResponse({ answer: 'uno' });
    const r2 = makeVLMResponse({ answer: 'dos' });
    const r3 = makeVLMResponse({ answer: 'tres' });

    small.set('a', r1);
    small.set('b', r2);

    // Access 'a' — makes 'b' the oldest
    small.get('a');

    // Insert 'c' — should evict 'b' (now oldest), not 'a'
    small.set('c', r3);

    expect(small.get('a')).toEqual(r1);
    expect(small.get('b')).toBeNull();
    expect(small.get('c')).toEqual(r3);
  });
});

// ============================================================
// T-V02: LocalVLM
// ============================================================
describe('LocalVLM', () => {
  let localVLM: LocalVLM;

  beforeEach(() => {
    localVLM = new LocalVLM();
  });

  it('query returns null when model not loaded', async () => {
    const result = await localVLM.query(makeVLMQuery());
    expect(result).toBeNull();
  });

  it('preload resolves successfully', async () => {
    await expect(localVLM.preload()).resolves.toBeUndefined();
  });

  it('isSupported returns false by default', () => {
    expect(localVLM.isSupported()).toBe(false);
  });

  it('timeout returns null when inference hangs', async () => {
    vi.useFakeTimers();

    const vlm = new LocalVLM({ timeoutMs: 100 });
    // Enable model support so query enters the inference+timeout race
    vi.spyOn(vlm, 'isSupported').mockReturnValue(true);

    const queryPromise = vlm.query(makeVLMQuery());

    // Advance time past timeout
    await vi.advanceTimersByTimeAsync(150);

    const result = await queryPromise;
    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it('accepts custom timeout in constructor', () => {
    const custom = new LocalVLM({ timeoutMs: 9999 });
    expect(custom.isSupported()).toBe(false);
  });
});

// ============================================================
// T-V03: callQiniuVLM
// ============================================================
describe('callQiniuVLM', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns VLMResponse with source qiniu on success', async () => {
    const mockData = { answer: '七牛云回答', tokensUsed: 10 };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await callQiniuVLM('img', 'question?');

    expect(result).toEqual({
      answer: '七牛云回答',
      source: 'qiniu',
      tokensUsed: 10,
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/vlm');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body.image).toBe('img');
    expect(body.question).toBe('question?');
  });

  it('throws VLMTimeoutError on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
      return new Promise((_resolve, reject) => {
        const err = new DOMException('The operation was aborted', 'AbortError');
        reject(err);
      });
    });

    await expect(callQiniuVLM('img', 'q')).rejects.toThrow(VLMTimeoutError);
  });

  it('throws VLMAPIError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'server error' }),
    } as Response);

    await expect(callQiniuVLM('img', 'q')).rejects.toThrow(VLMAPIError);
  });

  it('passes history in request body', async () => {
    const history: ConversationTurn[] = [
      { question: '这是什么？', answer: '一只猫' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: '是的' }),
    } as Response);

    await callQiniuVLM('img2', '是猫吗？', history);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.history).toEqual(history);
  });
});

// ============================================================
// T-V04: VisionLanguageModel
// ============================================================
describe('VisionLanguageModel', () => {
  let vlm: VisionLanguageModel;

  beforeEach(() => {
    vi.restoreAllMocks();
    vlm = new VisionLanguageModel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cache hit returns cached response (source: cache)', async () => {
    const query = makeVLMQuery();
    const cacheKey = `${query.question}|${query.image.slice(-40)}`;

    // Access private cache to pre-seed
    const cachedResp = makeVLMResponse({ answer: '缓存答案', source: 'cache' });
    (vlm as unknown as { cache: { set: (k: string, r: VLMResponse) => void } }).cache.set(cacheKey, cachedResp);

    const result = await vlm.query(query);

    expect(result.answer).toBe('缓存答案');
    expect(result.source).toBe('cache');
  });

  it('cache miss -> local model fail -> Qiniu returns (source: qiniu)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: '云端答案', tokensUsed: 5 }),
    } as Response);

    const result = await vlm.query(makeVLMQuery());

    expect(result.answer).toBe('云端答案');
    expect(result.source).toBe('qiniu');
  });

  it('local model success returns (source: local-model)', async () => {
    const vlmLocal = new VisionLanguageModel({ localModelEnabled: true });

    const mockLocalResp = makeVLMResponse({ answer: '本地回答', source: 'local-model' });
    vi.spyOn(
      (vlmLocal as unknown as { localModel: LocalVLM }).localModel,
      'query',
    ).mockResolvedValueOnce(mockLocalResp);

    const result = await vlmLocal.query(makeVLMQuery());

    expect(result.answer).toBe('本地回答');
    expect(result.source).toBe('local-model');
  });

  it('Qiniu failure propagates error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new VLMAPIError());

    await expect(vlm.query(makeVLMQuery())).rejects.toThrow(VLMAPIError);
  });

  it('preloadModel calls local preload', async () => {
    const preloadSpy = vi.spyOn(
      (vlm as unknown as { localModel: LocalVLM }).localModel,
      'preload',
    ).mockResolvedValueOnce(undefined);

    await vlm.preloadModel();

    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it('getCacheStats returns cache statistics', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: 'x' }),
    } as Response);

    const query = makeVLMQuery();
    await vlm.query(query);

    const stats = vlm.getCacheStats();
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBeGreaterThanOrEqual(0);
  });

  it('clearCache empties cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: 'y' }),
    } as Response);

    await vlm.query(makeVLMQuery());

    vlm.clearCache();

    const stats = vlm.getCacheStats();
    expect(stats.size).toBe(0);
  });

  it('cache result after successful Qiniu query', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: '首次查询' }),
    } as Response);
    globalThis.fetch = fetchMock;

    const query = makeVLMQuery();

    // First call: cache miss, goes to Qiniu
    const r1 = await vlm.query(query);
    expect(r1.answer).toBe('首次查询');
    expect(r1.source).toBe('qiniu');

    // Second call: should be cache hit — no second fetch
    const r2 = await vlm.query(query);
    expect(r2.answer).toBe('首次查询');
    expect(r2.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses CONFIG defaults when no config passed', () => {
    const defaultVlm = new VisionLanguageModel();
    const stats = defaultVlm.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('accepts custom cacheSize', () => {
    const custom = new VisionLanguageModel({ cacheSize: 50 });
    const stats = custom.getCacheStats();
    expect(stats.size).toBe(0);
  });
});
