// ============================================================
// 配置常量 — AI 视觉对话助手
// 所有阈值、超时集中管理，支持环境变量覆盖
// ============================================================

export const CONFIG = {
  camera: {
    width: 640,
    height: 480,
    fps: 30,
    jpegQuality: 0.6,
    diffThreshold: 15,
    lowPowerFps: 0.5,
  },
  audio: {
    sampleRate: 16000,
    vadThreshold: 0.02,
    silenceTimeoutMs: 1500,
    chunkDurationMs: 10000,
  },
  asr: {
    lang: 'zh-CN',
    fallbackEnabled: true,
    timeoutMs: 5000,
  },
  vlm: {
    cacheSize: 100,
    localModelEnabled: true,
  },
  tts: {
    lang: 'zh-CN',
    rate: 1.0,
    pitch: 1.0,
    fallbackEnabled: true,
  },
  powerSaver: {
    /** 无交互降帧率等待时间 (ms) */
    idleTimeoutMs: 10000,
  },
  api: {
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',
    timeoutMs: 15000,
  },
} as const;

export type AppConfig = typeof CONFIG;
