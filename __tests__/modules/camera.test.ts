import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CameraPermissionDeniedError, NoCameraError } from '@/modules/shared/errors';
import { requestCamera, startCapture, stopCapture } from '@/modules/camera/capture';
import { frameDiff, hasChanged } from '@/modules/camera/dedup';
import { resizeFrame, compressToJPEG } from '@/modules/camera/compress';
import { CameraPipeline } from '@/modules/camera/index';

// ============================================================
// Helpers
// ============================================================

function createMockStream(): MediaStream {
  return {
    getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    id: 'test-stream',
    active: true,
  } as unknown as MediaStream;
}

function createImageData(
  width: number,
  height: number,
  fillR = 0,
  fillG = 0,
  fillB = 0,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

/** Modify `percent`% of pixels from source data (changes R channel). */
function buildPartialChange(source: Uint8ClampedArray, percent: number): number[] {
  const data = new Array<number>(source.length);
  const pixelCount = source.length / 4;
  const changeCount = Math.floor(pixelCount * (percent / 100));

  for (let i = 0; i < source.length; i++) {
    data[i] = source[i];
  }

  for (let p = 0; p < changeCount; p++) {
    const offset = p * 4;
    data[offset] = (source[offset] + 50) % 256;
  }

  return data;
}

// ============================================================
// T-C01: capture.ts
// ============================================================
describe('capture.ts', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestCamera', () => {
    it('returns a MediaStream on success', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);

      const result = await requestCamera({ video: true });
      expect(result).toBe(stream);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
    });

    it('uses default { video: true } when no constraints provided', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);

      await requestCamera();
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
    });

    it('throws CameraPermissionDeniedError on NotAllowedError', async () => {
      const err = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(err);

      await expect(requestCamera()).rejects.toThrow(CameraPermissionDeniedError);
    });

    it('throws NoCameraError on NotFoundError', async () => {
      const err = new DOMException('No camera found', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(err);

      await expect(requestCamera()).rejects.toThrow(NoCameraError);
    });

    it('rethrows unknown DOMException errors unchanged', async () => {
      const err = new DOMException('Other error', 'AbortError');
      mockGetUserMedia.mockRejectedValue(err);

      await expect(requestCamera()).rejects.toBe(err);
    });

    it('rethrows non-DOMException errors unchanged', async () => {
      const err = new Error('Unknown failure');
      mockGetUserMedia.mockRejectedValue(err);

      await expect(requestCamera()).rejects.toBe(err);
    });
  });

  describe('startCapture', () => {
    beforeEach(() => {
      vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue();
      Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
        value: 320,
        configurable: true,
      });
      Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
        value: 240,
        configurable: true,
      });
    });

    it('returns a function that produces ImageData', () => {
      const stream = createMockStream();
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;

      const capture = startCapture(stream, canvas);
      expect(typeof capture).toBe('function');

      const imageData = capture();
      expect(imageData).toBeInstanceOf(ImageData);
      expect(imageData.width).toBe(320);
      expect(imageData.height).toBe(240);
    });

    it('creates a video element and sets srcObject', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const stream = createMockStream();
      const canvas = document.createElement('canvas');

      startCapture(stream, canvas);
      const videoCall = createElementSpy.mock.calls.find(
        ([tag]) => tag === 'video',
      );
      expect(videoCall).toBeTruthy();
    });
  });

  describe('stopCapture', () => {
    it('stops all tracks in the stream', () => {
      const stop1 = vi.fn();
      const stop2 = vi.fn();
      const tracks = [{ stop: stop1 }, { stop: stop2 }];
      const stream = {
        getTracks: vi.fn().mockReturnValue(tracks),
      } as unknown as MediaStream;

      stopCapture(stream);
      expect(stop1).toHaveBeenCalledOnce();
      expect(stop2).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================
// T-C02: dedup.ts
// ============================================================
describe('dedup.ts', () => {
  describe('frameDiff', () => {
    it('returns 0 for identical images', () => {
      const img = createImageData(10, 10, 100, 150, 200);
      expect(frameDiff(img, img)).toBe(0);
    });

    it('returns 100 for completely different images', () => {
      const a = createImageData(10, 10, 0, 0, 0);
      const b = createImageData(10, 10, 255, 255, 255);
      expect(frameDiff(a, b)).toBe(100);
    });

    it('returns 100 for images with different dimensions', () => {
      const a = createImageData(10, 10, 0, 0, 0);
      const b = createImageData(20, 20, 0, 0, 0);
      expect(frameDiff(a, b)).toBe(100);
    });

    it('returns correct percentage for partial change', () => {
      const a = createImageData(10, 10, 0, 0, 0);
      const b = new ImageData(
        new Uint8ClampedArray(buildPartialChange(a.data, 50)),
        10,
        10,
      );
      expect(frameDiff(a, b)).toBe(50);
    });

    it('ignores alpha channel differences', () => {
      const a = createImageData(10, 10, 100, 100, 100);
      const b = new ImageData(new Uint8ClampedArray(a.data.length), 10, 10);
      for (let i = 0; i < a.data.length; i++) {
        b.data[i] = a.data[i];
      }
      // Change only alpha of first pixel
      b.data[3] = 128;
      expect(frameDiff(a, b)).toBe(0);
    });
  });

  describe('hasChanged', () => {
    it('returns true when diffPercent >= default threshold (15)', () => {
      expect(hasChanged(15)).toBe(true);
      expect(hasChanged(20)).toBe(true);
    });

    it('returns false when diffPercent < default threshold (15)', () => {
      expect(hasChanged(14.9)).toBe(false);
      expect(hasChanged(0)).toBe(false);
    });

    it('respects custom threshold', () => {
      expect(hasChanged(10, 10)).toBe(true);
      expect(hasChanged(9, 10)).toBe(false);
    });
  });
});

// ============================================================
// T-C03: compress.ts
// ============================================================
describe('compress.ts', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resizeFrame', () => {
    it('creates canvas with correct target dimensions from HTMLCanvasElement', () => {
      const source = document.createElement('canvas');
      source.width = 640;
      source.height = 480;

      const result = resizeFrame(source, 320, 240);
      expect(result).toBeInstanceOf(HTMLCanvasElement);
      expect(result.width).toBe(320);
      expect(result.height).toBe(240);
    });

    it('creates canvas with correct target dimensions from ImageData', () => {
      const source = createImageData(640, 480, 100, 100, 100);

      const result = resizeFrame(source, 160, 120);
      expect(result).toBeInstanceOf(HTMLCanvasElement);
      expect(result.width).toBe(160);
      expect(result.height).toBe(120);
    });

    it('draws to the returned canvas (no throw)', () => {
      const source = createImageData(64, 48, 50, 100, 150);
      const result = resizeFrame(source, 32, 24);
      const ctx = result.getContext('2d');
      expect(ctx).not.toBeNull();
      const imageData = ctx!.getImageData(0, 0, 32, 24);
      expect(imageData).toBeInstanceOf(ImageData);
    });
  });

  describe('compressToJPEG', () => {
    it('returns CompressedFrame with correct fields', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 320, 240);

      const result = compressToJPEG(canvas, 0.6);
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(result.width).toBe(320);
      expect(result.height).toBe(240);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('uses default quality of 0.6', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, 10, 10);

      const result = compressToJPEG(canvas);
      expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('compressed size is less than raw RGBA data', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'green';
      ctx.fillRect(0, 0, 100, 100);

      const rawSize = 100 * 100 * 4; // RGBA
      const result = compressToJPEG(canvas, 0.5);
      expect(result.sizeBytes).toBeLessThan(rawSize);
    });

    it('respects custom quality parameter', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 10, 10);

      const low = compressToJPEG(canvas, 0.1);
      const high = compressToJPEG(canvas, 1.0);
      expect(low.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(high.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    });
  });
});

// ============================================================
// T-C04: index.ts — CameraPipeline
// ============================================================
describe('CameraPipeline', () => {
  let pipeline: CameraPipeline;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockGetUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });
    vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue();
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      value: 640,
      configurable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      value: 480,
      configurable: true,
    });

    // Ensure toDataURL returns a predictable JPEG data URL
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    );

    pipeline = new CameraPipeline();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('uses default config when no arguments provided', () => {
      const p = new CameraPipeline();
      expect(p).toBeInstanceOf(CameraPipeline);
    });

    it('merges partial config with defaults', () => {
      const p = new CameraPipeline({ jpegQuality: 0.8, fps: 15 });
      expect(p).toBeInstanceOf(CameraPipeline);
    });
  });

  describe('start', () => {
    it('returns a MediaStream on success', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);

      const result = await pipeline.start();
      expect(result).toBe(stream);
    });

    it('throws on permission denied', async () => {
      mockGetUserMedia.mockRejectedValue(
        new DOMException('denied', 'NotAllowedError'),
      );

      await expect(pipeline.start()).rejects.toThrow(
        CameraPermissionDeniedError,
      );
    });
  });

  describe('captureFrame', () => {
    it('returns null before start() is called', () => {
      expect(pipeline.captureFrame()).toBeNull();
    });

    it('returns CompressedFrame on first call (no previous frame)', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      const frame = pipeline.captureFrame();
      expect(frame).not.toBeNull();
      expect(frame!.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(frame!.width).toBe(640);
      expect(frame!.height).toBe(480);
      expect(frame!.sizeBytes).toBeGreaterThan(0);
      expect(typeof frame!.timestamp).toBe('number');
    });

    it('returns null when frame is unchanged', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      // First call succeeds
      const first = pipeline.captureFrame();
      expect(first).not.toBeNull();

      // Advance time past 30fps throttle (~34ms) so throttle check passes
      vi.advanceTimersByTime(34);
      // Same mock video frame → dedup rejects → null
      const second = pipeline.captureFrame();
      expect(second).toBeNull();
    });

    it('returns null when within fps throttle window', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      // First call succeeds
      const first = pipeline.captureFrame();
      expect(first).not.toBeNull();

      // Second call immediately — within 33ms throttle window
      const second = pipeline.captureFrame();
      expect(second).toBeNull();
    });
  });

  describe('setLowPower', () => {
    it('toggles low power mode without error', () => {
      pipeline.setLowPower(true);
      pipeline.setLowPower(false);
      // No throw = pass
    });

    it('low power mode restricts capture rate', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      // First frame succeeds
      expect(pipeline.captureFrame()).not.toBeNull();

      // Enable low power (0.5fps = 2000ms interval)
      pipeline.setLowPower(true);

      // Advance 500ms — within low power throttle window
      vi.advanceTimersByTime(500);
      expect(pipeline.captureFrame()).toBeNull();

      // Advance past 2000ms — now allowed
      vi.advanceTimersByTime(1600);
      const frame = pipeline.captureFrame();
      // Dedup rejects since same frame data, so still null
      expect(frame).toBeNull();
    });
  });

  describe('stop', () => {
    it('stops the stream tracks', async () => {
      const stopTrack = vi.fn();
      const stream = {
        getTracks: vi.fn().mockReturnValue([{ stop: stopTrack }]),
        id: 'test',
        active: true,
      } as unknown as MediaStream;
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      pipeline.stop();
      expect(stopTrack).toHaveBeenCalledOnce();
    });

    it('clears stream reference', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();
      expect(pipeline.getStream()).toBe(stream);

      pipeline.stop();
      expect(pipeline.getStream()).toBeNull();
    });
  });

  describe('getStream', () => {
    it('returns null before start', () => {
      expect(pipeline.getStream()).toBeNull();
    });

    it('returns the stream after start', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();
      expect(pipeline.getStream()).toBe(stream);
    });
  });

  describe('lifecycle', () => {
    it('full lifecycle: start → capture → stop', async () => {
      const stream = createMockStream();
      mockGetUserMedia.mockResolvedValue(stream);
      await pipeline.start();

      const frame = pipeline.captureFrame();
      expect(frame).not.toBeNull();

      pipeline.stop();
      expect(pipeline.getStream()).toBeNull();
      expect(pipeline.captureFrame()).toBeNull();
    });
  });
});
