import { CameraPermissionDeniedError, NoCameraError } from '../shared/errors';

/**
 * 请求摄像头权限并返回 MediaStream。
 * NotAllowedError → CameraPermissionDeniedError
 * NotFoundError   → NoCameraError
 */
export async function requestCamera(
  constraints?: MediaStreamConstraints,
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(
      constraints ?? { video: true },
    );
  } catch (err: unknown) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        throw new CameraPermissionDeniedError();
      }
      if (err.name === 'NotFoundError') {
        throw new NoCameraError();
      }
    }
    throw err;
  }
}

/**
 * 启动摄像头采集，返回一个截帧函数。
 * 调用返回的函数会将当前视频帧绘制到 canvas 并返回 ImageData。
 */
export function startCapture(
  stream: MediaStream,
  canvas: HTMLCanvasElement,
): () => ImageData {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.play().catch(() => {
    // play() may be interrupted; ignore
  });

  return (): ImageData => {
    if (video.videoWidth > 0) {
      canvas.width = video.videoWidth;
    }
    if (video.videoHeight > 0) {
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };
}

/**
 * 停止摄像头采集，停止流中所有轨道。
 */
export function stopCapture(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
