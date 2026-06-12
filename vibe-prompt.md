# AI 视觉对话助手 — Vibe Coding Prompt

> **用法**: 根据执行环境复制对应版本。
> - **Version A**: 粘贴到任意 LLM 对话中，单次对话完成全项目构建。
> - **Version B**: 配合 Claude Code 多智能体编排使用。

---

# Version A — 单次对话提示词

复制下方所有内容到任意 LLM（Claude、ChatGPT、Gemini）开始构建。

---

## Project: AI 视觉对话助手

你是 AI 视觉对话助手应用的构建者。这是一个**浏览器端 AI 视觉对话应用**——用户打开摄像头与麦克风，AI 看到画面、听懂语音、用语音回答。

### Target
七牛云比赛作品。核心亮点：**端云协同成本控制**——端侧全链路优先，仅失败/复杂时才上云。

### Tech Stack
- Language: TypeScript 5.x (strict)
- Framework: Next.js 14 (App Router)
- Package manager: pnpm
- Testing: Vitest + React Testing Library
- Linting: ESLint + Prettier
- Type checking: tsc --noEmit (strict)
- Styling: Tailwind CSS
- State: React Context + useReducer
- 端侧 AI: Transformers.js (浏览器内推理)
- 云端 AI: 七牛云 API (ASR / VLM / TTS)

### Requirements

#### P0 — Must Have (MVP)

- [ ] **FR-001**: 摄像头实时画面捕获 — getUserMedia + Canvas 截帧
- [ ] **FR-002**: 端侧帧去重 — 帧差算法检测画面变化，无变化不处理
- [ ] **FR-003**: 麦克风拾音与 VAD — Web Audio API + 端侧静音检测
- [ ] **FR-004**: 语音转文字 (ASR) — Web Speech API 主力，失败→七牛云 ASR
- [ ] **FR-005**: 视觉理解 + 回答 (VLM) — Transformers.js 端侧优先 → 缓存 → 七牛云 VLM
- [ ] **FR-006**: 文字转语音 (TTS) — Web Speech Synthesis 主力，失败→七牛云 TTS
- [ ] **FR-007**: 答案缓存 — 同类问题命中直接返回，不重复调 API
- [ ] **FR-008**: 端侧预处理 — 降分辨率 (max 640px) + JPEG 压缩 (q=0.6)
- [ ] **FR-009**: 低功耗模式 — 10s 无交互降帧率至 0.5fps
- [ ] **FR-010**: 交互 UI — 摄像头预览 + 对话气泡 + 状态指示

#### P1 — Should Have
（本阶段无 P1 — 成本策略已融入 P0）

#### P2 — Nice to Have
- [ ] **FR-201**: 对话历史（多轮上下文）
- [ ] **FR-202**: 截图保存（画面+回答）
- [ ] **FR-203**: 文字聊天 fallback
- [ ] **FR-204**: 深色模式
- [ ] **FR-205**: 移动端适配
- [ ] **FR-206**: 中英文切换

### Architecture

```
qiniu-vision-chat/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 主页面
│   └── api/                      # API 代理（隐藏 Key）
│       ├── asr/route.ts          # 七牛云 ASR 代理
│       ├── vlm/route.ts          # 七牛云 VLM 代理
│       └── tts/route.ts          # 七牛云 TTS 代理
├── modules/
│   ├── shared/                   # 横切：类型、配置、错误类
│   ├── camera/                   # 摄像头 + 帧去重 + 压缩
│   ├── audio/                    # 麦克风 + VAD
│   ├── asr/                      # 语音识别（端→云 fallback）
│   ├── vlm/                      # 视觉语言模型（缓存→本地→云）
│   ├── tts/                      # 语音合成（端→云 fallback）
│   └── orchestrator/             # 会话引擎（协调 + 状态机 + 成本统计）
├── components/                   # React UI
│   ├── CameraPreview.tsx         # 摄像头预览
│   ├── ChatBubble.tsx            # 对话气泡
│   ├── ConversationPanel.tsx     # 对话列表
│   ├── StatusIndicator.tsx       # 状态指示（监听/思考/播报）
│   ├── Controls.tsx              # 控制按钮
│   ├── DebugPanel.tsx            # 调试面板（帧率/延迟/成本）
│   └── PermissionGate.tsx        # 权限引导
├── hooks/                        # React Hooks
│   ├── useCamera.ts
│   ├── useOrchestrator.ts
│   └── useConversation.ts
└── __tests__/
    ├── modules/
    └── components/
```

### Module Responsibilities

| Module | Responsibility | Key Decision |
|--------|---------------|--------------|
| shared | 类型、配置常量、自定义错误类 | 无依赖，先构建 |
| camera | getUserMedia + Canvas截帧 + 帧差去重 + 降分辨率 + JPEG压缩 | 低功耗 0.5fps |
| audio | Web Audio API 录音 + RMS VAD 静音检测 + 音频分段 | 静音 1.5s 切段 |
| api-routes | Next.js API Routes 代理七牛云 ASR/VLM/TTS，隐藏 Key | 服务端环境变量 |
| asr | Web Speech API → 七牛云 ASR fallback | 双路识别 |
| vlm | LRU缓存 → Transformers.js → 七牛云 VLM 三级 fallback | 本地模型优先 |
| tts | Web Speech Synthesis → 七牛云 TTS fallback | 双路合成 |
| orchestrator | 状态机 + 主管线 + 低功耗管理 + 成本统计 | 六层成本漏斗 |
| ui | React 组件 + hooks + 页面组装 | 响应式布局 |
| integration | 集成测试 + README + 设计文档 + 部署验证 | 最后完成 |

### Cost Funnel (6 Layers)

```
Raw 30fps (huge)
 → Layer 1: 低功耗 0.5fps (60x)
 → Layer 2: 帧差去重 (~10x)
 → Layer 3: 降分辨率 640px (~5x)
 → Layer 4: JPEG q=0.6 (~10x)
 → Layer 5: 答案缓存命中 (0 tokens)
 → Layer 6: 本地模型答得了 (0 tokens)
 → Bottom: 云端 API (only when necessary)
```

### Build Order

Follow exact order. Each module must pass quality gates before next.

1. **shared** — no deps, foundation for all types and config
2. **camera** + **audio** + **api-routes** — parallel, all depend on shared
3. **asr** — depends on audio + api-routes
4. **vlm** — depends on camera + api-routes
5. **tts** — depends on api-routes
6. **orchestrator** — depends on camera + audio + asr + vlm + tts
7. **ui** — depends on orchestrator + camera
8. **integration** — depends on ALL

---

## Per-Module Build Instructions

### Module 1: shared

**Responsibility**: 共享类型、配置常量、自定义错误类。

**Tasks**:

- **T-S01**: 定义所有共享 TypeScript 类型
  - AC: `shared/types.ts` 含 CameraConfig, CompressedFrame, AudioConfig, AudioChunk, ASRResult, VLMQuery, VLMResponse, TTSResult, ConversationState, ConversationEvent, CostStats, Message；零 `any`；tsc 通过
  - Depends on: none
  - Est: 20 min

- **T-S02**: 配置常量 + 自定义错误类
  - AC: `shared/config.ts` 导出 CONFIG 对象含所有阈值，可环境变量覆盖；`shared/errors.ts` 含 CameraPermissionDeniedError, NoCameraError, MicPermissionDeniedError, NoMicrophoneError, AudioContextError, ASRTimeoutError, ASRAPIError, VLMTimeoutError, VLMAPIError, TTSError；每个含中文消息
  - Depends on: T-S01
  - Est: 25 min

---

### Module 2: camera

**Responsibility**: 打开摄像头、Canvas 截帧、帧差去重、降分辨率、JPEG 压缩。

**Tasks**:

- **T-C01**: getUserMedia + Canvas 截帧
  - AC: `capture.ts` 导出 requestCamera/startCapture/stop；权限拒绝 throw CameraPermissionDeniedError；无摄像头 throw NoCameraError
  - Depends on: T-S01
  - Est: 25 min

- **T-C02**: 帧差去重
  - AC: `dedup.ts` 导出 frameDiff(prev, curr): number + hasChanged(diff, threshold): boolean；阈值 15%
  - Depends on: T-C01
  - Est: 20 min

- **T-C03**: 帧压缩（降分辨率 + JPEG）
  - AC: `compress.ts` 导出 resizeFrame + compressToJPEG → CompressedFrame {dataUrl, width, height, sizeBytes, timestamp}；压缩后 size < 原始 20%
  - Depends on: T-C01
  - Est: 20 min

- **T-C04**: CameraPipeline 组装 + 低功耗模式
  - AC: `index.ts` 导出 CameraPipeline；captureFrame() = 截帧→去重→压缩，无变化返 null；setLowPower(bool) 切换 30fps↔0.5fps
  - Depends on: T-C02, T-C03
  - Est: 25 min

**Public Interface**:
```typescript
export class CameraPipeline {
  constructor(config: Partial<CameraConfig>);
  start(): Promise<MediaStream>;
  captureFrame(): CompressedFrame | null;
  setLowPower(enabled: boolean): void;
  stop(): void;
  getStream(): MediaStream | null;
}
```

---

### Module 3: audio

**Responsibility**: 打开麦克风、Web Audio API 录音、VAD 静音检测、音频分段。

**Tasks**:

- **T-A01**: Web Audio API 录音
  - AC: `capture.ts` 导出 requestMicrophone + startRecording；权限拒绝 throw MicPermissionDeniedError；输出 Float32Array 回调
  - Depends on: T-S01
  - Est: 25 min

- **T-A02**: VAD 静音检测 + 音频分段
  - AC: `vad.ts` 导出 computeRMS + detectSpeech(threshold=0.02)；AudioChunker 类：累积有语音帧→静音 1.5s→切段 AudioChunk {blob, durationMs, hasSpeech}；纯静音丢弃；最大 10s 自动切段
  - Depends on: T-A01
  - Est: 25 min

- **T-A03**: AudioCapture 组装
  - AC: `index.ts` 导出 AudioCapture；start() 启动；onChunk(cb) 注册回调；isSpeaking() 状态查询
  - Depends on: T-A02
  - Est: 20 min

**Public Interface**:
```typescript
export class AudioCapture {
  constructor(config: Partial<AudioConfig>);
  start(): Promise<void>;
  onChunk(callback: (chunk: AudioChunk) => void): void;
  isSpeaking(): boolean;
  stop(): void;
}
```

---

### Module 4: api-routes

**Responsibility**: Next.js API Routes 代理七牛云 API，隐藏 Key。

**Tasks**:

- **T-API01**: 七牛云 ASR 代理 — POST /api/asr，接收 audio Blob，转发七牛云 ASR，返回 {text, confidence}
  - Depends on: T-S02 | Est: 20 min

- **T-API02**: 七牛云 VLM 代理 — POST /api/vlm，接收 {image, question}，转发七牛云 VLM，返回 {answer, tokensUsed}，图片 >500KB 返回 413
  - Depends on: T-S02 | Est: 20 min

- **T-API03**: 七牛云 TTS 代理 — POST /api/tts，接收 {text}，转发七牛云 TTS，返回 audio/mpeg 流
  - Depends on: T-S02 | Est: 10 min

---

### Module 5: asr

**Responsibility**: 接收 AudioChunk → Web Speech API 主力 → 失败 fallback 七牛云 ASR。

**Tasks**:

- **T-ASR01**: Web Speech API 封装 — SpeechRecognition + lang 配置 + 跨浏览器兼容；失败/no-match 返 null
  - Depends on: T-S01 | Est: 25 min

- **T-ASR02**: 七牛云 ASR 客户端 — callQiniuASR(blob) → POST /api/asr；超时/错误 throw ASRTimeoutError/ASRAPIError
  - Depends on: T-API01 | Est: 15 min

- **T-ASR03**: SpeechRecognizer 组装 — recognize() 先端后云；isSupported() 检测兼容性；记录 latencyMs
  - Depends on: T-ASR01, T-ASR02 | Est: 20 min

**Public Interface**:
```typescript
export class SpeechRecognizer {
  constructor(config: Partial<ASRConfig>);
  recognize(chunk: AudioChunk): Promise<ASRResult>;
  abort(): void;
  isSupported(): boolean;
}
```

---

### Module 6: vlm

**Responsibility**: LRU缓存 → Transformers.js 本地模型 → 七牛云 VLM，三级 fallback。

**Tasks**:

- **T-V01**: LRU 答案缓存 — get/set/getStats；容量 100；key = text + frame hash
  - Depends on: T-S01 | Est: 25 min

- **T-V02**: Transformers.js 本地推理 — LocalVLM 类；preload() 预热；query() 5s 超时返 null；isSupported() 检测
  - Depends on: T-S01 | Est: 30 min

- **T-V03**: 七牛云 VLM 客户端 — callQiniuVLM(image, question, history?) → POST /api/vlm，返回 {answer, tokensUsed}
  - Depends on: T-API02 | Est: 15 min

- **T-V04**: VisionLanguageModel 组装 — query() 缓存→本地→云端逐级 fallback；preloadModel() 后台预热
  - Depends on: T-V01, T-V02, T-V03 | Est: 20 min

**Public Interface**:
```typescript
export class VisionLanguageModel {
  constructor(config?: { cacheSize?: number; localModelEnabled?: boolean });
  query(input: VLMQuery): Promise<VLMResponse>;
  preloadModel(): Promise<void>;
  getCacheStats(): { size: number; hitRate: number };
  clearCache(): void;
}
```

---

### Module 7: tts

**Responsibility**: Web Speech Synthesis 主力播报 → 失败 fallback 七牛云 TTS。

**Tasks**:

- **T-T01**: Web Speech Synthesis 封装 — SpeechSynthesisUtterance + lang/rate/pitch；speak() 完成 resolve，失败返 null
  - Depends on: T-S01 | Est: 20 min

- **T-T02**: 七牛云 TTS 客户端 — callQiniuTTS(text) → POST /api/tts；播放 audio/mpeg
  - Depends on: T-API03 | Est: 15 min

- **T-T03**: TextToSpeech 组装 — speak() 先端后云；stop() 中断；onEnd(cb) 回调
  - Depends on: T-T01, T-T02 | Est: 15 min

**Public Interface**:
```typescript
export class TextToSpeech {
  constructor(config: Partial<TTSConfig>);
  speak(text: string): Promise<TTSResult>;
  stop(): void;
  isSupported(): boolean;
  isSpeaking(): boolean;
  onEnd(callback: () => void): void;
}
```

---

### Module 8: orchestrator

**Responsibility**: 协调全管线，管理状态机，控制低功耗，统计成本。

**Tasks**:

- **T-O01**: 状态机 — IDLE → LISTENING → THINKING → SPEAKING → IDLE；ERROR 可从任意状态进入
  - Depends on: T-S01 | Est: 20 min

- **T-O02**: Pipeline — processVoiceInput(chunk) 走完整链路：ASR→VLM→TTS；每步捕获异常降级
  - Depends on: T-O01 | Est: 30 min

- **T-O03**: 低功耗管理 — IDLE 10s → camera.setLowPower(true)；交互恢复；rAF 驱动计时
  - Depends on: T-O01, T-C04 | Est: 15 min

- **T-O04**: Orchestrator 组装 + 成本统计 — inject 所有模块；start()/stop() 全部资源；getCostStats() 汇总 cloudCalls + tokensUsed + estimatedCostRMB
  - Depends on: T-O02, T-O03 | Est: 25 min

**Public Interface**:
```typescript
export class Orchestrator {
  constructor(deps: { camera, audio, asr, vlm, tts });
  start(): Promise<void>;
  stop(): void;
  getState(): ConversationState;
  onEvent(cb: (e: ConversationEvent) => void): void;
  getCostStats(): CostStats;
  submitText(text: string): void;  // P2
}
```

---

### Module 9: ui

**Responsibility**: React 组件 + hooks + 页面组装。

**Tasks**:

- **T-U01**: useCamera hook — 封装 CameraPipeline 生命周期；error 映射中文提示
  - Depends on: T-C04 | Est: 20 min

- **T-U02**: useOrchestrator hook — 初始化 Orchestrator；state/messages/costStats 实时同步
  - Depends on: T-O04 | Est: 25 min

- **T-U03**: CameraPreview — <video> 显示画面，镜像翻转；PermissionGate 引导
  - Depends on: T-U01 | Est: 20 min

- **T-U04**: StatusIndicator — 四状态动画（IDLE灰/LISTENING绿波/THINKING蓝转/SPEAKING黄波/ERROR红闪）
  - Depends on: T-U02 | Est: 20 min

- **T-U05**: ChatBubble + ConversationPanel — 消息气泡（文本+缩略图+来源badge）；自动滚底；>100条保留50条
  - Depends on: T-U02 | Est: 20 min

- **T-U06**: Controls — 开始/停止按钮 + 静音 + 文字输入框 + 低功耗指示灯
  - Depends on: T-U02 | Est: 20 min

- **T-U07**: DebugPanel — 帧率/帧差/VAD音量/ASR延迟/VLM source+延迟+tokens/TTS source/累计成本；可折叠
  - Depends on: T-U02 | Est: 25 min

- **T-U08**: 主页面 + layout — 组合所有组件：CameraPreview(全屏背景) + StatusIndicator(顶栏) + ConversationPanel(左下浮动) + Controls(底栏) + DebugPanel(右上可折叠)；Tailwind 响应式
  - Depends on: T-U03~T-U07 | Est: 20 min

---

### Module 10: integration

**Responsibility**: 集成测试 + README + 设计文档 + 部署验证。

**Tasks**:

- **T-I01**: E2E 集成测试 — mock 摄像头+麦克风；验证全链路 + 三级 fallback + 缓存命中 + 低功耗；覆盖率 >70%
  - Depends on: ALL | Est: 30 min

- **T-I02**: README — 项目简介+功能列表+技术栈+快速开始+环境变量+目录结构+demo链接+依赖清单
  - Depends on: T-I01 | Est: 25 min

- **T-I03**: 设计文档 (DESIGN.md) — ① 用户故事：计划 vs 实际 + 完成度 ② 成本控制技巧：规划 vs 实际 + 实测节省比例
  - Depends on: T-I01 | Est: 20 min

- **T-I04**: 部署验证 — `pnpm build` 通过；`pnpm dev` 一键启动；质量门禁全绿；demo 视频链接有效
  - Depends on: T-I02, T-I03 | Est: 15 min

---

## Quality Gates (Non-Negotiable)

After EVERY module:

```bash
# 1. All tests pass
npx vitest run __tests__/<module>/ -v

# 2. Zero type errors
npx tsc --noEmit

# 3. Zero lint errors
npx eslint modules/<module>/ --max-warnings 0
```

Final integration:
```bash
npx vitest run                    # All tests green
npx tsc --noEmit                  # Zero type errors
npx eslint . --max-warnings 0     # Zero lint errors
pnpm build                        # Production build success
pnpm dev                          # App works at localhost:3000
```

## Rules

1. 每个模块独立完成后再开始下一个
2. 不跳过质量门禁 — 有任何失败先修再继续
3. **先写测试（TDD），再写实现**
4. 所有公开函数必须有类型标注
5. 所有公开方法必须有 JSDoc
6. 用户可见文本用中文；代码标识符用英文
7. 每个 PR 只做一个模块（或子任务），PR 标题+描述+实现思路+测试方式完整

---

# Version B — Claude Code 工作流提示词

以下用于 Claude Code 多智能体编排。

---

## Master Agent: Project Orchestrator

```
You are the master agent for AI 视觉对话助手 (AI Visual Conversation Assistant).

Your responsibilities:
1. Read the project knowledge base (Version A above) as your complete context
2. Track overall progress against the module completion table below
3. Dispatch one sub-agent per module, in dependency order
4. Verify each sub-agent's output before marking the module complete
5. Report progress to the user after each module completes

Do NOT write code yourself. Your job is orchestration and quality verification.

Cost strategy reminder (core competition edge):
- Every module must respect the 6-layer cost funnel
- End-side first: Web Speech API → Transformers.js → Web Speech Synthesis
- Cloud ONLY as fallback: 七牛云 ASR → 七牛云 VLM → 七牛云 TTS
- Frame dedup + resize + JPEG compress before any cloud upload
- Answer cache must be consulted before any VLM call
- Low-power mode: 0.5fps when idle 10s
```

## Sub-Agent Dispatch Template

For each module, spawn a sub-agent with this prompt:

```
You are building [MODULE NAME] for AI 视觉对话助手.

Context:
- Project: Browser-based AI visual conversation assistant
- Competition: 七牛云 (Qiniu Cloud) — emphasis on edge-cloud cost control
- Module responsibility: [insert from detailed-design.md module spec]
- Public interface: [insert interface signatures]
- Dependencies you can use: [list completed modules only]

Your tasks (complete in order):
[Insert tasks from the module's task file]

Quality gates — ALL must pass before you report completion:
npx vitest run __tests__/modules/<module>.test.ts -v
npx tsc --noEmit
npx eslint modules/<module>/ --max-warnings 0

Output: working, tested TypeScript code for this module. Follow the code standards.
```

## Module Completion Table

| # | Module | Status | Tasks | Tests | tsc | eslint |
|---|--------|--------|-------|-------|-----|--------|
| 1 | shared | ⬜ Pending | 0/2 | — | — | — |
| 2 | camera | ⬜ Pending | 0/4 | — | — | — |
| 3 | audio | ⬜ Pending | 0/3 | — | — | — |
| 4 | api-routes | ⬜ Pending | 0/3 | — | — | — |
| 5 | asr | ⬜ Pending | 0/3 | — | — | — |
| 6 | vlm | ⬜ Pending | 0/4 | — | — | — |
| 7 | tts | ⬜ Pending | 0/3 | — | — | — |
| 8 | orchestrator | ⬜ Pending | 0/4 | — | — | — |
| 9 | ui | ⬜ Pending | 0/8 | — | — | — |
| 10 | integration | ⬜ Pending | 0/4 | — | — | — |

## Dispatch Order

```
Phase 1: shared (solo, no deps)

Phase 2: camera | audio | api-routes (parallel, all dep shared)

Phase 3: asr (dep audio+api) | vlm (dep camera+api) | tts (dep api)
         └── asr + vlm + tts can run parallel after deps met

Phase 4: orchestrator (dep camera+audio+asr+vlm+tts, solo)

Phase 5: ui (dep orchestrator+camera, solo)

Phase 6: integration (dep ALL, solo)
```

## Final Integration Checklist

After all modules complete:
- [ ] `npx vitest run` — full suite passes, coverage > 70%
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npx eslint . --max-warnings 0` — zero lint errors
- [ ] `pnpm build` — production build success
- [ ] `pnpm dev` — app works at localhost:3000
- [ ] README.md complete with demo video link
- [ ] DESIGN.md complete (user stories + cost control, planned vs actual)
- [ ] GitHub repo public, PR history clean, commits continuous
