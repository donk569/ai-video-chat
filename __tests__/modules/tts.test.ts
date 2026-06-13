import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextToSpeech } from '@/modules/tts';

// Mock Web Speech API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
let mockSpeaking = false;

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    get speaking() { return mockSpeaking; },
  },
  writable: true,
  configurable: true,
});

// Mock SpeechSynthesisUtterance
(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class {
  lang = '';
  rate = 1;
  pitch = 1;
  text = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
};

describe('TextToSpeech', () => {
  let tts: TextToSpeech;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpeaking = false;
    tts = new TextToSpeech();
  });

  it('isSupported returns true when speechSynthesis available', () => {
    expect(tts.isSupported()).toBe(true);
  });

  it('speak uses Web Speech first', async () => {
    // Mock speak to fire onend immediately
    mockSpeak.mockImplementation((utterance: { onend?: () => void }) => {
      setTimeout(() => utterance.onend?.(), 0);
    });

    const result = await tts.speak('你好世界');
    expect(result.source).toBe('web-speech');
    expect(mockSpeak).toHaveBeenCalledOnce();
  });

  it('speak falls back to Qiniu when Web Speech fails', async () => {
    mockSpeak.mockImplementation((utterance: { onerror?: () => void }) => {
      setTimeout(() => utterance.onerror?.(), 0);
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(new Blob(['fake-audio'], { type: 'audio/mpeg' }), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    );

    const result = await tts.speak('测试');
    expect(result.source).toBe('qiniu');
  });

  it('stop calls speechSynthesis.cancel', () => {
    tts.stop();
    expect(mockCancel).toHaveBeenCalled();
  });

  it('isSpeaking delegates to speechSynthesis', () => {
    mockSpeaking = true;
    expect(tts.isSpeaking()).toBe(true);
  });

  it('onEnd callback fires on successful speak', async () => {
    const onEnd = vi.fn();
    tts.onEnd(onEnd);

    mockSpeak.mockImplementation((utterance: { onend?: () => void }) => {
      setTimeout(() => utterance.onend?.(), 0);
    });

    await tts.speak('hello');
    expect(onEnd).toHaveBeenCalled();
  });

  it('respects fallbackEnabled = false', async () => {
    const noFallback = new TextToSpeech({ fallbackEnabled: false });

    mockSpeak.mockImplementation((utterance: { onerror?: () => void }) => {
      setTimeout(() => utterance.onerror?.(), 0);
    });

    await expect(noFallback.speak('test')).rejects.toThrow('TTS 不可用');
  });
});
