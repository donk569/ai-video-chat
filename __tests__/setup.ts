import '@testing-library/jest-dom';

// ---- Polyfill globals missing in jsdom ----

// ImageData (available in jsdom 24+ but may be missing in older versions)
if (typeof globalThis.ImageData === 'undefined') {
  // @ts-expect-error — polyfill
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace?: PredefinedColorSpace;
    constructor(data: Uint8ClampedArray | number, widthOrSw: number, height?: number) {
      if (typeof data === 'number') {
        const w = data;
        const h = widthOrSw;
        this.data = new Uint8ClampedArray(w * h * 4);
        this.width = w;
        this.height = h!;
      } else {
        this.data = data;
        this.width = widthOrSw;
        this.height = height!;
      }
    }
  };
}

// AudioContext (not available in jsdom)
if (typeof globalThis.AudioContext === 'undefined') {
  (globalThis as Record<string, unknown>).AudioContext = class {
    sampleRate = 44100;
    state = 'running';
    destination = {};
    close() {}
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createScriptProcessor() {
      return {
        onaudioprocess: null as ((event: unknown) => void) | null,
        connect() {},
        disconnect() {},
      };
    }
  };
}

// Canvas mock for jsdom — intercept getContext to return minimal 2d context.
// jsdom does not implement <canvas>; without this, getContext('2d') returns null.
const origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  ...rest: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (contextId === '2d') {
    return {
      drawImage: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) =>
        new ImageData(w, h),
      putImageData: () => {},
      fillRect: () => {},
      clearRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      canvas: this,
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      measureText: () => ({ width: 0 }),
      fillText: () => {},
    };
  }
  return origGetContext.call(this, contextId, ...rest);
};

// jsdom does not implement HTMLVideoElement.play
HTMLVideoElement.prototype.play = async () => {};
