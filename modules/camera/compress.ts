import type { CompressedFrame } from '../shared/types';

/**
 * 估算 base64 数据 URL 的实际字节大小。
 * 去除 data:…;base64, 前缀，按 base64 编码规则计算。
 */
function base64ByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  const padding = (base64.match(/=+$/) ?? [''])[0].length;
  return (base64.length * 3) / 4 - padding;
}

/**
 * 将源内容缩放绘制到目标尺寸的新 canvas 上。
 */
export function resizeFrame(
  source: HTMLCanvasElement | ImageData,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  if (source instanceof ImageData) {
    const temp = document.createElement('canvas');
    temp.width = source.width;
    temp.height = source.height;
    temp.getContext('2d')!.putImageData(source, 0, 0);
    ctx.drawImage(temp, 0, 0, targetWidth, targetHeight);
  } else {
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  }

  return canvas;
}

/**
 * 将 canvas 内容输出为 JPEG data URL，返回 CompressedFrame。
 * 默认质量 0.6。
 */
export function compressToJPEG(
  canvas: HTMLCanvasElement,
  quality: number = 0.6,
): CompressedFrame {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    sizeBytes: base64ByteLength(dataUrl),
    timestamp: Date.now(),
  };
}
