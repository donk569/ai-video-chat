// ============================================================
// 自定义错误类 — AI 视觉对话助手
// 每个错误含中文友好消息，用户可传入自定义消息覆盖
// ============================================================

/** 应用基础错误 */
export class AppError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}

/** 摄像头权限被拒绝 */
export class CameraPermissionDeniedError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '摄像头权限被拒绝。请在浏览器设置中允许访问摄像头，然后重试。',
      'CameraPermissionDeniedError',
    );
  }
}

/** 未检测到摄像头设备 */
export class NoCameraError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '未检测到摄像头设备。请确认摄像头已正确连接。',
      'NoCameraError',
    );
  }
}

/** 麦克风权限被拒绝 */
export class MicPermissionDeniedError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '麦克风权限被拒绝。请在浏览器设置中允许访问麦克风，然后重试。',
      'MicPermissionDeniedError',
    );
  }
}

/** 未检测到麦克风设备 */
export class NoMicrophoneError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '未检测到麦克风设备。请确认麦克风已正确连接。',
      'NoMicrophoneError',
    );
  }
}

/** 音频上下文初始化失败 */
export class AudioContextError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '音频系统初始化失败，请刷新页面后重试。',
      'AudioContextError',
    );
  }
}

/** ASR 识别超时 */
export class ASRTimeoutError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '语音识别超时，正在切换到备用服务重试…',
      'ASRTimeoutError',
    );
  }
}

/** 七牛云 ASR API 错误 */
export class ASRAPIError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '语音识别服务暂时不可用，请稍后重试。',
      'ASRAPIError',
    );
  }
}

/** VLM 视觉识别超时 */
export class VLMTimeoutError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '视觉理解超时，正在切换到备用模型重试…',
      'VLMTimeoutError',
    );
  }
}

/** 七牛云 VLM API 错误 */
export class VLMAPIError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '视觉理解服务暂时不可用，请稍后重试。',
      'VLMAPIError',
    );
  }
}

/** TTS 语音合成错误 */
export class TTSError extends AppError {
  constructor(customMessage?: string) {
    super(
      customMessage ?? '语音合成失败，请稍后重试。',
      'TTSError',
    );
  }
}
