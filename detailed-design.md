# AI 视觉对话助手 — 详细设计 (Detailed Design)

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript 5.x (strict) | 类型安全，PR 规范要求代码质量 |
| Framework | Next.js 14 (App Router) | API Routes 做云端代理，React 生态成熟 |
| Package manager | pnpm | 快，磁盘省 |
| Testing | Vitest + React Testing Library | Vite 原生，Next.js 兼容 |
| Linting | ESLint + Prettier | Next.js 默认集成 |
| Type checking | tsc --noEmit (strict) | TypeScript 严格模式 |
| Styling | Tailwind CSS | 快速出 UI，不写独立 CSS 文件 |
| State | React Context + useReducer | 轻量，不引入 Redux |
| 端侧 AI | Transformers.js | 浏览器内推理，零成本 |
| 云端 AI | 七牛云 API (ASR/VLM/TTS) | 赛题要求 |

## Module Architecture

```
qiniu-vision-chat/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 主页面 — 组合所有组件
│   └── api/                      # 后端 API 代理（隐藏 API Key）
│       ├── asr/route.ts          # 七牛云 ASR 代理
│       ├── vlm/route.ts          # 七牛云 VLM 代理
│       └── tts/route.ts          # 七牛云 TTS 代理
├── modules/
│   ├── camera/                   # 摄像头捕获 + 帧处理管线
│   │   ├── index.ts              # Public API
│   │   ├── capture.ts            # getUserMedia + Canvas 截帧
│   │   ├── dedup.ts              # 帧差去重
│   │   └── compress.ts           # 降分辨率 + JPEG 压缩
│   ├── audio/                    # 麦克风捕获 + VAD
│   │   ├── index.ts              # Public API
│   │   ├── capture.ts            # Web Audio API 录音
│   │   └── vad.ts                # 端侧静音检测
│   ├── asr/                      # 语音识别
│   │   ├── index.ts              # Public API
│   │   ├── web-speech.ts         # Web Speech API 封装
│   │   └── qiniu-asr.ts          # 七牛云 ASR fallback
│   ├── vlm/                      # 视觉语言模型
│   │   ├── index.ts              # Public API
│   │   ├── local-model.ts        # Transformers.js 本地推理
│   │   ├── qiniu-vlm.ts          # 七牛云 VLM API
│   │   └── cache.ts              # 答案缓存 (LRU)
│   ├── tts/                      # 文字转语音
│   │   ├── index.ts              # Public API
│   │   ├── web-speech.ts         # Web Speech Synthesis 封装
│   │   └── qiniu-tts.ts          # 七牛云 TTS fallback
│   ├── orchestrator/             # 会话引擎 — 协调各模块
│   │   ├── index.ts              # Public API
│   │   ├── pipeline.ts           # 主处理管线
│   │   ├── state-machine.ts      # 状态机 (idle/listening/thinking/speaking)
│   │   └── power-saver.ts        # 低功耗模式
│   └── shared/                   # 横切工具
│       ├── types.ts              # 共享类型定义
│       ├── config.ts             # 配置常量（阈值、超时等）
│       └── errors.ts             # 自定义错误类
├── components/                   # React UI 组件
│   ├── CameraPreview.tsx         # 摄像头预览区
│   ├── ChatBubble.tsx            # 对话气泡
│   ├── ConversationPanel.tsx     # 对话列表容器
│   ├── StatusIndicator.tsx       # 状态指示器（监听/思考/播报）
│   ├── Controls.tsx              # 开始/停止/静音按钮
│   ├── DebugPanel.tsx            # 调试信息（帧率、延迟、成本统计）
│   └── PermissionGate.tsx        # 权限请求引导
├── hooks/                        # React Hooks
│   ├── useCamera.ts              # 摄像头 hook
│   ├── useAudio.ts               # 麦克风 hook
│   ├── useOrchestrator.ts        # 编排器 hook
│   └── useConversation.ts        # 对话状态 hook
├── __tests__/                    # 测试
│   ├── modules/
│   │   ├── camera.test.ts
│   │   ├── audio.test.ts
│   │   ├── asr.test.ts
│   │   ├── vlm.test.ts
│   │   ├── tts.test.ts
│   │   └── orchestrator.test.ts
│   └── components/
│       ├── CameraPreview.test.tsx
│       ├── ChatBubble.test.tsx
│       └── Controls.test.tsx
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── vitest.config.ts
└── README.md
```

## Module Specifications

---

### Module: camera — 摄像头捕获与帧处理

**Responsibility**: 打开摄像头、Canvas 截帧、帧差去重、降分辨率、JPEG 压缩，输出可传输的压缩帧。

**Public Interface**:
```typescript
// modules/camera/index.ts
export interface CameraConfig {
  width: number;          // 目标分辨率宽度 (default: 640)
  height: number;         // 目标分辨率高度 (default: 480)
  fps: number;            // 捕获帧率 (default: 30)
  jpegQuality: number;    // JPEG 压缩质量 0-1 (default: 0.6)
  diffThreshold: number;  // 帧差阈值 0-255 (default: 15)
  lowPowerFps: number;    // 低功耗帧率 (default: 0.5)
}

export interface CompressedFrame {
  dataUrl: string;        // base64 JPEG data URL
  width: number;
  height: number;
  sizeBytes: number;      // 压缩后字节数
  timestamp: number;
}

export class CameraPipeline {
  constructor(config: Partial<CameraConfig>);
  start(): Promise<MediaStream>;           // 请求权限，开启摄像头
  captureFrame(): CompressedFrame | null;  // 截帧+去重+压缩，无变化返 null
  setLowPower(enabled: boolean): void;     // 切换低功耗模式
  stop(): void;                            // 停止摄像头
  getStream(): MediaStream | null;         // 获取原始流（给预览用）
}
```

**Dependencies**:
- `shared/types.ts` — CompressedFrame 等共享类型

**Depended on by**: `orchestrator` (获取帧), UI components (摄像头预览)

**Error Handling**:
- `NotAllowedError` (权限拒绝) → 抛出 `CameraPermissionDeniedError`，UI 展示权限引导
- `NotFoundError` (无摄像头) → 抛出 `NoCameraError`，UI 提示无设备
- Canvas 截帧失败 → 跳过本帧，log warning，不中断管线

**Test Strategy**:
- Unit: 模拟 getUserMedia，验证 start/stop/captureFrame
- Edge: 权限拒绝、无摄像头、浏览器不支持、帧差边界值、暗光画面

---

### Module: audio — 麦克风捕获与 VAD

**Responsibility**: 打开麦克风、Web Audio API 录音、端侧音量检测 (VAD)，输出音频片段。

**Public Interface**:
```typescript
// modules/audio/index.ts
export interface AudioConfig {
  sampleRate: number;       // 采样率 (default: 16000)
  vadThreshold: number;     // VAD 音量阈值 0-1 (default: 0.02)
  silenceTimeoutMs: number; // 静音超时(ms)后切段 (default: 1500)
  chunkDurationMs: number;  // 每段最大时长 (default: 10000)
}

export interface AudioChunk {
  blob: Blob;               // 音频数据 (WAV)
  durationMs: number;
  hasSpeech: boolean;       // VAD 判断结果
  timestamp: number;
}

export class AudioCapture {
  constructor(config: Partial<AudioConfig>);
  start(): Promise<void>;
  onChunk(callback: (chunk: AudioChunk) => void): void;  // 有语音段时回调
  isSpeaking(): boolean;                                  // 当前是否在说话
  stop(): void;
}
```

**Dependencies**:
- `shared/types.ts`

**Depended on by**: `asr` (接收音频做识别), `orchestrator` (状态切换)

**Error Handling**:
- `NotAllowedError` (麦克风权限) → 抛出 `MicPermissionDeniedError`
- `NotFoundError` (无麦克风) → 抛出 `NoMicrophoneError`
- AudioContext 创建失败 → 抛出 `AudioContextError`

**Test Strategy**:
- Unit: 模拟 AudioContext + getUserMedia，验证 VAD 阈值判断
- Edge: 极低音量边界、短语音突发、长静音段

---

### Module: asr — 语音识别

**Responsibility**: 接收 AudioChunk，Web Speech API 主力识别，失败时 fallback 七牛云 ASR。

**Public Interface**:
```typescript
// modules/asr/index.ts
export interface ASRResult {
  text: string;
  confidence: number;      // 置信度 0-1
  source: 'web-speech' | 'qiniu';
  latencyMs: number;
}

export interface ASRConfig {
  lang: string;            // 语言 (default: 'zh-CN')
  fallbackEnabled: boolean; // 是否启用云端 fallback (default: true)
  timeoutMs: number;       // 超时时间 (default: 5000)
}

export class SpeechRecognizer {
  constructor(config: Partial<ASRConfig>);
  recognize(chunk: AudioChunk): Promise<ASRResult>;
  abort(): void;
  isSupported(): boolean;  // 检查浏览器是否支持 Web Speech API
}
```

**Dependencies**:
- `audio` — 输入 AudioChunk
- `../../app/api/asr/route.ts` — 七牛云 ASR 代理（网络请求）

**Depended on by**: `orchestrator`

**Error Handling**:
- Web Speech API 不支持 → 自动 fallback 七牛云
- Web Speech API 返回空 → fallback 七牛云
- 七牛云 API 超时 → 抛出 `ASRTimeoutError`，提示用户重试
- 七牛云 API 返回错误 → 抛出 `ASRAPIError`，含状态码

**Test Strategy**:
- Unit: 模拟 SpeechRecognition API + fetch，验证识别+fallback 链路
- Edge: 双路都失败、网络断开、空音频输入、极短语音

---

### Module: vlm — 视觉语言模型

**Responsibility**: 接收文本问题 + 压缩帧，缓存命中直接返，否则本地模型 → 云端模型逐级尝试。

**Public Interface**:
```typescript
// modules/vlm/index.ts
export interface VLMQuery {
  text: string;                    // 用户问题
  frame: CompressedFrame | null;   // 当前帧（可能无变化为 null）
  history?: ConversationTurn[];    // P2 对话历史
}

export interface VLMResponse {
  answer: string;
  source: 'cache' | 'local-model' | 'qiniu';
  latencyMs: number;
  tokensUsed?: number;             // 云端 token 消耗（成本追踪）
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
  frameDataUrl?: string;
}

export class VisionLanguageModel {
  constructor(config?: { cacheSize?: number; localModelEnabled?: boolean });
  query(input: VLMQuery): Promise<VLMResponse>;
  preloadModel(): Promise<void>;   // 预热本地模型
  getCacheStats(): { size: number; hitRate: number };
  clearCache(): void;
}
```

**Dependencies**:
- `camera` — CompressedFrame 类型
- `cache.ts` — LRU 缓存
- `local-model.ts` — Transformers.js 推理
- `qiniu-vlm.ts` — 七牛云 API
- `../../app/api/vlm/route.ts` — API 代理

**Depended on by**: `orchestrator`

**Error Handling**:
- 本地模型加载失败 → fallback 云端，log warning
- 云端 API 超时 → 重试 1 次，再失败抛 `VLMTimeoutError`
- 云端 API 返回错误 → 抛 `VLMAPIError`
- Transformers.js 不支持当前浏览器 → 跳过本地模型，直接云端

**Test Strategy**:
- Unit: 模拟 fetch + Transformers.js pipeline，验证三层 fallback
- Edge: 缓存命中/未命中、无帧输入、空文本输入、双路都失败

---

### Module: tts — 文字转语音

**Responsibility**: Web Speech Synthesis 主力播报，失败时 fallback 七牛云 TTS。

**Public Interface**:
```typescript
// modules/tts/index.ts
export interface TTSConfig {
  lang: string;              // 语言 (default: 'zh-CN')
  rate: number;              // 语速 0.1-10 (default: 1.0)
  pitch: number;             // 音高 0-2 (default: 1.0)
  fallbackEnabled: boolean;
}

export interface TTSResult {
  source: 'web-speech' | 'qiniu';
  latencyMs: number;
}

export class TextToSpeech {
  constructor(config: Partial<TTSConfig>);
  speak(text: string): Promise<TTSResult>;
  stop(): void;
  isSupported(): boolean;
  isSpeaking(): boolean;
  onEnd(callback: () => void): void;   // 播报结束回调
}
```

**Dependencies**:
- `../../app/api/tts/route.ts` — 七牛云 TTS 代理

**Depended on by**: `orchestrator`

**Error Handling**:
- Web Speech Synthesis 不支持 → 自动 fallback 七牛云
- 七牛云 API 超时/失败 → 抛出 `TTSError`，UI 显示文本作为 fallback

**Test Strategy**:
- Unit: 模拟 SpeechSynthesis API + fetch，验证播报+fallback
- Edge: 长文本、空文本、快速连续调用、中途打断

---

### Module: orchestrator — 会话引擎

**Responsibility**: 协调全管线，管理状态机，控制低功耗模式。是整个应用的核心调度器。

**Public Interface**:
```typescript
// modules/orchestrator/index.ts
export enum ConversationState {
  IDLE = 'idle',           // 等待唤醒
  LISTENING = 'listening', // 听用户说话
  THINKING = 'thinking',   // AI 处理中
  SPEAKING = 'speaking',   // AI 播报中
  ERROR = 'error',         // 异常状态
}

export interface ConversationEvent {
  type: 'state-change' | 'user-message' | 'ai-message' | 'error' | 'cost-update';
  payload: unknown;
}

export interface CostStats {
  cloudASRCalls: number;
  cloudVLMCalls: number;
  cloudTTSCalls: number;
  totalTokensUsed: number;
  estimatedCostRMB: number;
}

export class Orchestrator {
  constructor(deps: {
    camera: CameraPipeline;
    audio: AudioCapture;
    asr: SpeechRecognizer;
    vlm: VisionLanguageModel;
    tts: TextToSpeech;
  });

  start(): Promise<void>;              // 启动全管线
  stop(): void;                        // 停止，释放资源
  getState(): ConversationState;
  onEvent(cb: (e: ConversationEvent) => void): void;
  getCostStats(): CostStats;
  submitText(text: string): void;      // P2: 文字输入 fallback
}
```

**Dependencies**: camera, audio, asr, vlm, tts — 全部五个模块

**Depended on by**: UI hooks, components

**Error Handling**:
- 任一模塊抛错 → 状态切到 ERROR，log 错误，UI 展示具体原因
- 网络恢复检测 → 自动重连
- 管线超时 → 30s 无响应自动 reset 到 IDLE

**Test Strategy**:
- Unit: 模拟全部依赖，验证状态机流转、管线调度
- Integration: 全链路测试 (mock 摄像头+麦克风输入 → 验证 TTS 被调用)
- Edge: 快速开始/停止、单模块故障影响隔离、内存泄漏检测

---

### Module: shared — 横切工具

**Responsibility**: 共享类型、配置常量、自定义错误类。

```typescript
// modules/shared/types.ts
export type { CameraConfig, CompressedFrame } from '../camera';
export type { AudioConfig, AudioChunk } from '../audio';
export type { ASRConfig, ASRResult } from '../asr';
export type { VLMQuery, VLMResponse, ConversationTurn } from '../vlm';
export type { TTSConfig, TTSResult } from '../tts';
export type { ConversationState, ConversationEvent, CostStats } from '../orchestrator';
```

```typescript
// modules/shared/config.ts
export const CONFIG = {
  camera: { width: 640, height: 480, fps: 30, jpegQuality: 0.6, diffThreshold: 15, lowPowerFps: 0.5 },
  audio: { sampleRate: 16000, vadThreshold: 0.02, silenceTimeoutMs: 1500, chunkDurationMs: 10000 },
  asr: { lang: 'zh-CN', fallbackEnabled: true, timeoutMs: 5000 },
  vlm: { cacheSize: 100, localModelEnabled: true },
  tts: { lang: 'zh-CN', rate: 1.0, pitch: 1.0, fallbackEnabled: true },
  powerSaver: { idleTimeoutMs: 10000 },  // 10s 无交互降帧率
  api: { baseURL: '/api', timeoutMs: 15000 },
} as const;
```

## Data Flow

### 主交互流程

```
User speaks "这个是什么？"
        │
        ▼
┌─ AudioCapture ──────────────────────────────────────────────────────┐
│  1. 录音，Web Audio API 持续采集                                      │
│  2. VAD 检测: RMS > 0.02 → hasSpeech=true                           │
│  3. 静音 1.5s 后切段 → AudioChunk { blob, hasSpeech: true }         │
└─────────────────────────────────────────────────────────────────────┘
        │ AudioChunk
        ▼
┌─ SpeechRecognizer ──────────────────────────────────────────────────┐
│  1. Web Speech API: "这个是什么？" confidence=0.92 → source='web-speech' │
│  2. 失败? → POST /api/asr → 七牛云 ASR → 返回文本                    │
│  3. → ASRResult { text: "这个是什么？", source: 'web-speech' }        │
└─────────────────────────────────────────────────────────────────────┘
        │ text
        ▼
┌─ CameraPipeline ────────────────────────────────────────────────────┐
│  1. Canvas 截帧 640×480                                               │
│  2. 帧差 vs 上一帧: diff=42% > 15% → 有变化                          │
│  3. JPEG compress quality=0.6: 320KB → 28KB                         │
│  4. → CompressedFrame { dataUrl, sizeBytes: 28672 }                 │
└─────────────────────────────────────────────────────────────────────┘
        │ text + frame
        ▼
┌─ VisionLanguageModel ───────────────────────────────────────────────┐
│  1. Cache check: hash(text+frame) → miss                            │
│  2. Local model (Transformers.js): "一个白色的杯子" → source='local-model' │
│  3. 本地答不上? → POST /api/vlm → 七牛云 VLM → source='qiniu'       │
│  4. → VLMResponse { answer: "一个白色的马克杯", source: 'local-model' }│
│  5. 写入 cache                                                       │
└─────────────────────────────────────────────────────────────────────┘
        │ answer
        ▼
┌─ TextToSpeech ──────────────────────────────────────────────────────┐
│  1. Web Speech Synthesis: speak("一个白色的马克杯")                    │
│  2. 失败? → POST /api/tts → 七牛云 TTS → 播放                        │
│  3. → TTSResult { source: 'web-speech' }                            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
    UI 更新对话气泡 + 状态回 IDLE
```

### 成本漏斗（每帧经过的过滤层）

```
Raw 30fps video stream (huge)
    │
    ▼ [Layer 1: 低功耗模式]  0.5fps when idle → 60x reduction
    │
    ▼ [Layer 2: 帧差去重]    仅变化帧通过 → ~10x reduction
    │
    ▼ [Layer 3: 降分辨率]    640x480 → ~5x byte reduction
    │
    ▼ [Layer 4: JPEG 压缩]   quality 0.6 → ~10x reduction
    │
    ▼ [Layer 5: 答案缓存]    命中 → 0 cloud tokens
    │
    ▼ [Layer 6: 本地模型]    答得了 → 0 cloud tokens
    │
    ▼ [Bottom: 云端 API]     only when necessary
```

## Data Models

### Message (对话消息)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | UUID |
| role | 'user' \| 'assistant' | Yes | 消息来源 |
| text | string | Yes | 消息文本 |
| frameDataUrl | string? | No | 用户消息附带画面（可选） |
| timestamp | number | Yes | 毫秒时间戳 |
| source | ASRResult['source'] \| VLMResponse['source'] | Yes | 处理来源（成本追踪） |

### ConversationState (会话状态)
```
IDLE ──(用户开始说话)──▶ LISTENING
LISTENING ──(静音超时)──▶ THINKING
THINKING ──(AI 回答就绪)──▶ SPEAKING
SPEAKING ──(播报完毕)──▶ IDLE
ANY ──(异常)──▶ ERROR
ERROR ──(重试/重置)──▶ IDLE
```

## Error Handling Strategy

- **User-facing errors**: 中文提示，含建议操作。例：「麦克风权限被拒绝，请在浏览器设置中允许访问麦克风」
- **Internal errors**: console.warn/error + 可选上报到 DebugPanel
- **Edge cases handled**:
  - 权限拒绝 → 引导页面
  - 网络断开 → 提示 + 自动重连
  - API 超时 → 重试 1 次 + 提示
  - 浏览器不支持 Web Speech / getUserMedia → 检测 + 提示升级浏览器
  - 摄像头被其他应用占用 → 提示关闭其他应用
- **Edge cases NOT handled** (P2/后续):
  - Safari 兼容性完整测试
  - 大并发用户
  - 弱网自适应码率

## Cross-Cutting Concerns

| Concern | Solution | Module |
|---------|----------|--------|
| Configuration | `shared/config.ts` — 所有阈值、超时集中管理 | shared |
| API Key 保护 | Next.js API Routes 代理，Key 仅存服务端环境变量 | app/api/ |
| Cost tracking | orchestrator 统计云端调用次数 + token 数 | orchestrator |
| Logging | 分级 log (debug/info/warn/error)，生产环境可关闭 debug | shared |
| Permission | 按需请求 — 用户点「开始」才请求摄像头+麦克风 | components/PermissionGate |
