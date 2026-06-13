import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// ============================================================
// Mocks — set up before any module imports via vi.mock hoisting
// ============================================================
const mockGetUserMedia = vi.fn();
const mockMediaStreamGetTracks = vi.fn();
const mockTrackStop = vi.fn();

// Hoist navigator mock before any imports — vi.mock is hoisted
vi.mock('@/modules/audio/capture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/audio/capture')>();
  return { ...actual };
});

beforeAll(() => {
  // Mock navigator.mediaDevices
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: { getUserMedia: mockGetUserMedia },
    },
    writable: true,
    configurable: true,
  });
});

import {
  requestMicrophone,
  startRecording,
  stopAll,
} from '@/modules/audio/capture';
import {
  MicPermissionDeniedError,
  NoMicrophoneError,
  AudioContextError,
} from '@/modules/shared/errors';
import { computeRMS, detectSpeech, AudioChunker } from '@/modules/audio/vad';
import type { AudioChunk } from '@/modules/shared/types';

// ============================================================
// T-A01: capture.ts
// ============================================================
describe('T-A01: capture.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-mock navigator after clearAllMocks (clearAllMocks may reset things)
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: { getUserMedia: mockGetUserMedia },
      },
      writable: true,
      configurable: true,
    });

    const mockTrack = { stop: mockTrackStop, kind: 'audio', label: '', enabled: true, muted: false, readyState: 'live' };
    const mockStream = {
      getTracks: mockMediaStreamGetTracks.mockReturnValue([mockTrack]),
      getAudioTracks: () => [mockTrack],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockMediaStreamGetTracks.mockReturnValue([mockTrack]);
  });

  describe('requestMicrophone', () => {
    it('returns stream and AudioContext on success', async () => {
      const result = await requestMicrophone();
      expect(result).toBeDefined();
      expect(result.stream).toBeDefined();
      expect(result.context).toBeDefined();
      expect(mockGetUserMedia).toHaveBeenCalledOnce();
    });

    it('passes constraints to getUserMedia', async () => {
      const constraints: MediaTrackConstraints = { echoCancellation: true };
      await requestMicrophone(constraints);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: constraints });
    });

    it('defaults to empty constraints object', async () => {
      await requestMicrophone();
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: {} });
    });

    it('throws MicPermissionDeniedError on NotAllowedError', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(error);
      await expect(requestMicrophone()).rejects.toThrow(MicPermissionDeniedError);
    });

    it('throws NoMicrophoneError on NotFoundError', async () => {
      const error = new DOMException('No microphone found', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(error);
      await expect(requestMicrophone()).rejects.toThrow(NoMicrophoneError);
    });

    it('rethrows unknown errors', async () => {
      const error = new Error('Something else');
      mockGetUserMedia.mockRejectedValue(error);
      await expect(requestMicrophone()).rejects.toThrow('Something else');
    });

    it('throws AudioContextError if AudioContext constructor throws', () => {
      const BrokenAudioContext = class {
        constructor() { throw new Error('Context creation failed'); }
      };
      (globalThis as Record<string, unknown>).AudioContext = BrokenAudioContext;

      // restore after test
      return requestMicrophone()
        .then(() => { throw new Error('Should have thrown'); })
        .catch((err) => {
          (globalThis as Record<string, unknown>).AudioContext = undefined;
          expect(err).toBeInstanceOf(AudioContextError);
        });
    });
  });

  describe('startRecording', () => {
    it('creates MediaStreamSource and ScriptProcessorNode', () => {
      const mockSource = { connect: vi.fn(), disconnect: vi.fn() };
      const mockProcessor = new MockScriptProcessorNode();
      const mockContext = {
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        destination: {},
        createMediaStreamSource: vi.fn().mockReturnValue(mockSource),
        createScriptProcessor: vi.fn().mockReturnValue(mockProcessor),
      } as unknown as AudioContext;
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;

      const stop = startRecording(mockContext, mockStream, () => {});

      expect(mockContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(typeof stop).toBe('function');
    });

    it('calls onData with Float32Array on audioprocess', () => {
      const mockProcessor = new MockScriptProcessorNode();
      const mockContext = {
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        destination: {},
        createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
        createScriptProcessor: vi.fn().mockReturnValue(mockProcessor),
      } as unknown as AudioContext;
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;

      const onData = vi.fn();
      startRecording(mockContext, mockStream, onData);

      const channelData = new Float32Array([0.1, 0.2, 0.3]);
      const mockEvent = {
        inputBuffer: {
          getChannelData: vi.fn().mockReturnValue(channelData),
          numberOfChannels: 1,
        },
      };
      mockProcessor.onaudioprocess?.(mockEvent as unknown as AudioProcessingEvent);

      expect(onData).toHaveBeenCalledOnce();
      const received = onData.mock.calls[0][0];
      expect(received).toBeInstanceOf(Float32Array);
      expect(received.length).toBe(3);
    });

    it('returns stop function that disconnects and closes', () => {
      const mockProcessor = new MockScriptProcessorNode();
      mockProcessor.disconnect = vi.fn();
      const mockSource = { connect: vi.fn(), disconnect: vi.fn() };
      const mockContext = {
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        destination: {},
        createMediaStreamSource: vi.fn().mockReturnValue(mockSource),
        createScriptProcessor: vi.fn().mockReturnValue(mockProcessor),
      } as unknown as AudioContext;
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;

      const stop = startRecording(mockContext, mockStream, () => {});
      stop();

      expect(mockProcessor.onaudioprocess).toBeNull();
    });
  });

  describe('stopAll', () => {
    it('stops tracks and closes context', () => {
      const mockClose = vi.fn();
      const mockContext = { close: mockClose } as unknown as AudioContext;
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: mockTrackStop }]),
      } as unknown as MediaStream;

      stopAll(mockStream, mockContext);

      expect(mockTrackStop).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('handles context already closed', () => {
      const mockClose = vi.fn().mockImplementation(() => { throw new Error('Already closed'); });
      const mockContext = { close: mockClose } as unknown as AudioContext;
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      } as unknown as MediaStream;

      expect(() => stopAll(mockStream, mockContext)).not.toThrow();
    });
  });
});

// ============================================================
// Mock ScriptProcessorNode helper
// ============================================================
class MockScriptProcessorNode {
  onaudioprocess: ((event: AudioProcessingEvent) => void) | null = null;
  connect(): void {}
  disconnect(): void {}
}

// ============================================================
// T-A02: vad.ts
// ============================================================
describe('T-A02: vad.ts', () => {
  describe('computeRMS', () => {
    it('returns 0 for all-zero buffer', () => {
      expect(computeRMS(new Float32Array([0, 0, 0, 0]))).toBe(0);
    });

    it('RMS of [1,1,1,1] = 1', () => {
      expect(computeRMS(new Float32Array([1, 1, 1, 1]))).toBeCloseTo(1.0, 5);
    });

    it('RMS of [0,2,0,2] = sqrt(2)', () => {
      expect(computeRMS(new Float32Array([0, 2, 0, 2]))).toBeCloseTo(Math.SQRT2, 5);
    });

    it('handles negative values (squared)', () => {
      expect(computeRMS(new Float32Array([-1, -1, -1, -1]))).toBeCloseTo(1.0, 5);
    });

    it('returns 0 for empty buffer', () => {
      expect(computeRMS(new Float32Array([]))).toBe(0);
    });
  });

  describe('detectSpeech', () => {
    it('returns true when RMS > threshold', () => {
      expect(detectSpeech(0.05, 0.02)).toBe(true);
    });

    it('returns false when RMS < threshold', () => {
      expect(detectSpeech(0.01, 0.02)).toBe(false);
    });

    it('returns false when RMS equals threshold', () => {
      expect(detectSpeech(0.02, 0.02)).toBe(false);
    });

    it('uses default threshold 0.02', () => {
      expect(detectSpeech(0.03)).toBe(true);
      expect(detectSpeech(0.01)).toBe(false);
    });
  });

  describe('AudioChunker', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('emits chunk after silence timeout', () => {
      const chunker = new AudioChunker({ silenceTimeoutMs: 100, chunkDurationMs: 10000 });
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(1024));
      chunker.addData(new Float32Array(1024)); // silence
      vi.advanceTimersByTime(200);

      expect(chunks.length).toBe(1);
      expect(chunks[0].blob).toBeInstanceOf(Blob);
      expect(chunks[0].hasSpeech).toBe(true);
    });

    it('discards pure silence chunks', () => {
      const chunker = new AudioChunker({ silenceTimeoutMs: 100, chunkDurationMs: 10000 });
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(new Float32Array(1024));
      vi.advanceTimersByTime(200);

      expect(chunks.length).toBe(0);
    });

    it('auto-splits at max duration', () => {
      const chunker = new AudioChunker({ silenceTimeoutMs: 1500, chunkDurationMs: 100 });
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(4096));
      vi.advanceTimersByTime(260);

      expect(chunks.length).toBe(1);
    });

    it('flush emits remaining chunk with speech', () => {
      const chunker = new AudioChunker({ silenceTimeoutMs: 1500 });
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(4096));
      vi.advanceTimersByTime(256);
      chunker.flush();

      expect(chunks.length).toBe(1);
      expect(chunks[0].hasSpeech).toBe(true);
    });

    it('flush does not emit if no data buffered', () => {
      const chunker = new AudioChunker();
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.flush();
      expect(chunks.length).toBe(0);
    });

    it('reset clears buffers', () => {
      const chunker = new AudioChunker();
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(4096));
      vi.advanceTimersByTime(256);
      chunker.reset();
      chunker.flush();

      expect(chunks.length).toBe(0);
    });

    it('uses defaults when no config provided', () => {
      const chunker = new AudioChunker();
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(4096));
      vi.advanceTimersByTime(256 + 1600);

      expect(chunks.length).toBe(1);
    });

    it('includes WAV blob with correct header', () => {
      const chunker = new AudioChunker({ silenceTimeoutMs: 100 });
      const chunks: AudioChunk[] = [];
      chunker.onChunk((chunk) => chunks.push(chunk));

      chunker.addData(createLoudAudio(4096));
      chunker.addData(new Float32Array(4096));
      vi.advanceTimersByTime(200);

      expect(chunks.length).toBe(1);
      const blob = chunks[0].blob;
      expect(blob.type).toBe('audio/wav');
      expect(blob.size).toBeGreaterThan(44);
    });
  });
});

function createLoudAudio(length: number): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = i % 2 === 0 ? 0.5 : -0.5;
  }
  return buffer;
}

// ============================================================
// T-A03: AudioCapture
// ============================================================
import { AudioCapture } from '@/modules/audio/index';

describe('T-A03: AudioCapture', () => {
  let mockStream: MediaStream;
  let mockContext: AudioContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockTrack = {
      stop: vi.fn(),
      kind: 'audio' as const,
      label: '',
      enabled: true,
      muted: false,
      readyState: 'live' as const,
    };
    mockStream = { getTracks: () => [mockTrack] } as unknown as MediaStream;
    mockContext = {
      close: vi.fn(),
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
      createScriptProcessor: vi.fn().mockReturnValue(new MockScriptProcessorNode()),
      sampleRate: 44100,
      state: 'running' as AudioContextState,
      destination: {},
    } as unknown as AudioContext;

    // Mock navigator for AudioCapture's internal requestMicrophone call
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue(mockStream),
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext constructor
    (globalThis as Record<string, unknown>).AudioContext = class {
      sampleRate = 44100;
      state = 'running';
      destination = {};
      close = mockContext.close;
      createMediaStreamSource = mockContext.createMediaStreamSource;
      createScriptProcessor = mockContext.createScriptProcessor;
    };
  });

  describe('start', () => {
    it('sets up recording pipeline', async () => {
      const capture = new AudioCapture({});
      await capture.start();
      // Should not throw — verifies the pipeline starts
    });

    it('does not start twice', async () => {
      const capture = new AudioCapture({});
      await capture.start();
      // Second start should be a no-op
      await capture.start();
      // Should not trigger duplicate getUserMedia
    });
  });

  describe('isSpeaking', () => {
    it('returns false before start', () => {
      const capture = new AudioCapture({});
      expect(capture.isSpeaking()).toBe(false);
    });

    it('returns false after start (no audio data yet)', async () => {
      const capture = new AudioCapture({});
      await capture.start();
      expect(capture.isSpeaking()).toBe(false);
    });
  });

  describe('stop', () => {
    it('is safe to call before start', () => {
      const capture = new AudioCapture({});
      expect(() => capture.stop()).not.toThrow();
    });

    it('stops without error after start', async () => {
      const capture = new AudioCapture({});
      await capture.start();
      expect(() => capture.stop()).not.toThrow();
      expect(capture.isSpeaking()).toBe(false);
    });
  });
});
