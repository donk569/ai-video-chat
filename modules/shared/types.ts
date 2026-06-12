// ============================================================
// 共享类型定义 — AI 视觉对话助手
// ============================================================

/** 摄像头配置 */
export interface CameraConfig {
  /** 目标帧宽度 (px) */
  width: number;
  /** 目标帧高度 (px) */
  height: number;
  /** 正常帧率 */
  fps: number;
  /** JPEG 压缩质量 (0-1) */
  jpegQuality: number;
  /** 帧差去重阈值 (百分比, 0-100) */
  diffThreshold: number;
  /** 低功耗模式帧率 */
  lowPowerFps: number;
}

/** 压缩后的帧 */
export interface CompressedFrame {
  /** base64 图片 */
  dataUrl: string;
  width: number;
  height: number;
  /** 压缩后大小 (bytes) */
  sizeBytes: number;
  /** 采集时间戳 (ms) */
  timestamp: number;
}

/** 麦克风配置 */
export interface AudioConfig {
  sampleRate: number;
  /** RMS 静音检测阈值 */
  vadThreshold: number;
  /** 静音超时 (ms)，触发切段 */
  silenceTimeoutMs: number;
  /** 最大分段时长 (ms) */
  chunkDurationMs: number;
}

/** 音频分段 */
export interface AudioChunk {
  /** 音频 Blob (WAV / webm) */
  blob: Blob;
  /** 时长 (ms) */
  durationMs: number;
  /** 是否含有效语音 */
  hasSpeech: boolean;
}

/** ASR 配置 */
export interface ASRConfig {
  lang: string;
  fallbackEnabled: boolean;
  timeoutMs: number;
}

/** 语音识别结果 */
export interface ASRResult {
  text: string;
  /** 置信度 (0-1)，Web Speech API 提供 */
  confidence?: number;
  /** 识别来源 */
  source: 'web-speech' | 'qiniu';
  /** 延迟 (ms) */
  latencyMs: number;
}

/** VLM 查询输入 */
export interface VLMQuery {
  /** base64 图片 */
  image: string;
  /** 用户问题文本 */
  question: string;
  /** 多轮上下文 (可选) */
  history?: ConversationTurn[];
}

/** VLM 回答 */
export interface VLMResponse {
  /** 回答文本 */
  answer: string;
  /** 回答来源 */
  source: 'cache' | 'local-model' | 'qiniu';
  /** 消耗 token 数 (仅云端有) */
  tokensUsed?: number;
}

/** 对话轮次 */
export interface ConversationTurn {
  question: string;
  answer: string;
}

/** TTS 配置 */
export interface TTSConfig {
  lang: string;
  rate: number;
  pitch: number;
  fallbackEnabled: boolean;
}

/** 语音合成结果 */
export interface TTSResult {
  source: 'web-speech' | 'qiniu';
}

/** 会话状态 */
export type ConversationState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/** 会话事件 */
export interface ConversationEvent {
  type: 'state_change' | 'user_message' | 'assistant_message' | 'error' | 'cost_update';
  payload?: unknown;
}

/** 成本统计 */
export interface CostStats {
  /** 云端 API 调用次数 */
  cloudCalls: number;
  /** 消耗 token 总数 */
  tokensUsed: number;
  /** 预估人民币成本 */
  estimatedCostRMB: number;
}

/** 对话消息 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** 用户消息附带画面 (可选) */
  frameDataUrl?: string;
  /** 毫秒时间戳 */
  timestamp: number;
  /** 处理来源（成本追踪） */
  source: ASRResult['source'] | VLMResponse['source'];
}
