# AI 视觉对话助手

浏览器端 AI 视觉对话应用 — 打开摄像头与麦克风，AI 看到画面、听懂语音、用语音回答。

> 七牛云比赛作品。核心亮点：**端云协同成本控制** — 端侧全链路优先，仅失败/复杂时才上云。

## 功能列表

- 摄像头实时画面捕获 + Canvas 截帧
- 端侧帧去重（像素差异检测）
- 麦克风拾音 + VAD 静音检测 + 自动分段
- 语音转文字 (ASR)：Web Speech API → 七牛云 ASR 双路 fallback
- 视觉理解 + 回答 (VLM)：LRU 缓存 → Transformers.js → 七牛云 VLM 三级 fallback
- 文字转语音 (TTS)：Web Speech Synthesis → 七牛云 TTS 双路 fallback
- 答案缓存：同类问题命中直接返回，不重复调 API
- 端侧预处理：降分辨率 (max 640px) + JPEG 压缩 (q=0.6)
- 低功耗模式：10s 无交互降帧率至 0.5fps
- 对话历史（多轮上下文）
- 文字聊天 fallback
- 调试面板：帧率 / 延迟 / 云端调用次数 / Token 消耗 / 预估成本

## 技术栈

| 层 | 技术 |
|---|------|
| Language | TypeScript 5.x (strict) |
| Framework | Next.js 14 (App Router) |
| Package manager | pnpm |
| Testing | Vitest + React Testing Library |
| Styling | Tailwind CSS |
| State | React Context + useReducer |
| 端侧 AI | Transformers.js |
| 云端 AI | 七牛云 API (ASR / VLM / TTS) |

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入七牛云 API 配置

# 开发模式启动
pnpm dev
# 打开 http://localhost:3000

# 运行测试
pnpm test

# 生产构建
pnpm build
```

## 环境变量

```env
QINIU_ASR_URL=https://your-asr-endpoint
QINIU_VLM_URL=https://your-vlm-endpoint
QINIU_TTS_URL=https://your-tts-endpoint
QINIU_API_KEY=your-api-key
```

## 目录结构

```
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页面
│   └── api/                # API 代理（隐藏 Key）
│       ├── asr/route.ts    # 七牛云 ASR
│       ├── vlm/route.ts    # 七牛云 VLM
│       └── tts/route.ts    # 七牛云 TTS
├── modules/
│   ├── shared/             # 类型、配置、错误类
│   ├── camera/             # 摄像头 + 帧去重 + 压缩
│   ├── audio/              # 麦克风 + VAD
│   ├── asr/                # 语音识别（端→云）
│   ├── vlm/                # 视觉模型（缓存→本地→云）
│   ├── tts/                # 语音合成（端→云）
│   └── orchestrator/       # 会话引擎 + 状态机 + 成本
├── components/             # React UI 组件
├── hooks/                  # React Hooks
└── __tests__/              # 测试
```

## 成本控制策略（6 层漏斗）

```
原始 30fps (巨大)
  → Layer 1: 低功耗 0.5fps (~60x)
  → Layer 2: 帧差去重 (~10x)
  → Layer 3: 降分辨率 640px (~5x)
  → Layer 4: JPEG q=0.6 (~10x)
  → Layer 5: 答案缓存命中 (0 tokens)
  → Layer 6: 本地模型 (0 tokens)
  → 云端 API (仅必要时)
```

## Demo

[Demo 视频](#) (待添加)

## 依赖清单

- next 14.x
- react 19.x
- react-dom 19.x
- tailwindcss 4.x
- @testing-library/react
- @testing-library/jest-dom
- vitest
- jsdom
- typescript 5.x
- eslint 9.x

## License

MIT
