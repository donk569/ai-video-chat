import type { CameraConfig, CompressedFrame } from '../shared/types';
import { CONFIG } from '../shared/config';
import { requestCamera, startCapture, stopCapture } from './capture';
import { frameDiff, hasChanged } from './dedup';
import { resizeFrame, compressToJPEG } from './compress';

/**
 * 摄像头采集流水线：采集 → 去重 → 压缩。
 *
 * 用法：
 *   const pipeline = new CameraPipeline({ width: 320, height: 240 });
 *   await pipeline.start();
 *   const frame = pipeline.captureFrame(); // CompressedFrame | null
 *   pipeline.setLowPower(true);            // 切换到低功耗模式
 *   pipeline.stop();
 */
export class CameraPipeline {
  private config: CameraConfig;
  private stream: MediaStream | null = null;
  private captureFn: (() => ImageData) | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private prevFrame: ImageData | null = null;
  private lowPower = false;
  private lastCaptureTime = 0;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...CONFIG.camera, ...config };
  }

  /** 启动摄像头，返回 MediaStream */
  async start(): Promise<MediaStream> {
    this.stream = await requestCamera({
      video: {
        width: { ideal: this.config.width },
        height: { ideal: this.config.height },
        frameRate: { ideal: this.config.fps },
      },
    });

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.captureFn = startCapture(this.stream, this.canvas);
    this.lastCaptureTime = 0;

    return this.stream;
  }

  /**
   * 执行完整流水线：截帧 → 去重 → 压缩。
   * - 首帧总是返回 CompressedFrame
   * - 后续帧变化低于阈值时返回 null
   * - 在 fps 节流窗口内返回 null
   */
  captureFrame(): CompressedFrame | null {
    if (!this.captureFn || !this.canvas) return null;

    const now = Date.now();
    const fps = this.lowPower ? this.config.lowPowerFps : this.config.fps;
    const interval = 1000 / fps;

    if (now - this.lastCaptureTime < interval) {
      return null;
    }
    this.lastCaptureTime = now;

    const imageData = this.captureFn();

    if (this.prevFrame) {
      const diff = frameDiff(this.prevFrame, imageData);
      if (!hasChanged(diff, this.config.diffThreshold)) {
        return null;
      }
    }

    this.prevFrame = imageData;

    const resized = resizeFrame(imageData, this.config.width, this.config.height);
    return compressToJPEG(resized, this.config.jpegQuality);
  }

  /** 切换低功耗模式 (30fps ↔ 0.5fps) */
  setLowPower(enabled: boolean): void {
    this.lowPower = enabled;
  }

  /** 停止摄像头并释放资源 */
  stop(): void {
    if (this.stream) {
      stopCapture(this.stream);
      this.stream = null;
    }
    this.captureFn = null;
    this.canvas = null;
    this.prevFrame = null;
  }

  /** 获取当前 MediaStream，未启动时返回 null */
  getStream(): MediaStream | null {
    return this.stream;
  }
}
