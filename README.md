# AI 视觉对话助手

> 浏览器端 AI 视觉对话应用 — 打开摄像头，AI 看见你的世界。开口即聊，AI 听懂你的声音。
>
> 🏆 七牛云比赛作品 · 核心亮点：**端云协同成本控制**

[![Demo](https://img.shields.io/badge/🎮-Live_Demo-cyan?style=for-the-badge)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🎮 在线体验

> **Demo 地址**：部署中...

---

## ✨ 功能

| 功能 | 描述 | 状态 |
|------|------|:--:|
| 🎤 语音对话 | 开口说话，AI 实时倾听并用语音回应 | ✅ |
| 💬 文字交流 | 打字也能流畅对话，支持中英文混输 | ✅ |
| 📹 实时画面 | 摄像头全屏预览，沉浸式对话体验 | ✅ |
| ⚡ 打断即停 | 说话或打字时 AI 自动停止播报，随时打断 | ✅ |
| 🎯 状态反馈 | 聆听 / 思考 / 播报 实时动画指示 | ✅ |
| 📊 成本追踪 | 云端调用次数 + Token 消耗 + 预估费用 | ✅ |
| 🔇 低功耗 | 10 秒无交互自动降帧率至 0.5fps | ✅ |
| 🗂️ 对话历史 | 多轮上下文，AI 记住之前说过的话 | ✅ |

## 🏗️ 架构

```
用户说话 → Web Speech API 语音识别 → 七牛云 VLM (DeepSeek-V3) → Web Speech TTS 播报
         ↘ 打字输入 ↘                              ↗ 文字回复
```

**6 层成本漏斗**：

```
原始 30fps 巨大 → 低功耗 0.5fps (60x) → 帧差去重 (10x)
→ 降分辨率 640px (5x) → JPEG q=0.6 (10x) → 缓存命中 (0 tokens) → 云端仅必要时
```

## 🛠️ 技术栈

| 层 | 方案 |
|---|------|
| 框架 | Next.js 16 (App Router) + TypeScript 5 |
| UI | Tailwind CSS 4 + Neo-Glass 设计 |
| AI | 七牛云 DeepSeek-V3 + kvl-qwen2.5-vl-7b |
| 语音 | Web Speech API (端侧) + 七牛云 ASR (云端兜底) |
| 语音合成 | Web Speech Synthesis (端侧) + 七牛云 TTS (兜底) |
| 缓存 | LRU 100 条答案缓存 |

## 🚀 快速开始

```bash
git clone https://github.com/donk569/ai-video-chat.git
cd ai-video-chat
pnpm install
cp .env.example .env.local
# 编辑 .env.local 填入七牛云 API Key
pnpm dev
# 打开 http://localhost:3000
```

## 🔑 环境变量

```env
QINIU_API_KEY=sk-xxx          # 七牛 AI API Key
QINIU_VLM_URL=https://...     # VLM 端点
QINIU_TEXT_MODEL=deepseek-v3  # 文本模型
QINIU_ACCESS_KEY=xxx          # Kodo 存储 AK (识图功能)
QINIU_SECRET_KEY=xxx          # Kodo 存储 SK (识图功能)
QINIU_BUCKET=xxx              # Kodo 存储桶 (识图功能)
```

## 📁 目录结构

```
├── app/
│   ├── page.tsx              # 产品主页 (Landing)
│   ├── chat/page.tsx         # AI 对话页
│   ├── layout.tsx            # 根布局
│   └── api/                  # API 代理
│       ├── asr/route.ts      # 七牛云 ASR 代理
│       ├── vlm/route.ts      # 七牛云 VLM 代理
│       └── tts/route.ts      # 七牛云 TTS 代理
├── modules/
│   ├── shared/               # 类型、配置、错误类
│   ├── camera/               # 摄像头 + 帧处理
│   ├── audio/                # 麦克风 + VAD
│   ├── asr/                  # 语音识别
│   ├── vlm/                  # 视觉语言模型 + 缓存
│   ├── tts/                  # 文字转语音
│   └── orchestrator/         # 会话引擎 + 状态机
├── components/               # React 组件 (7 个)
├── hooks/                    # React Hooks (3 个)
└── __tests__/                # 单元测试
```

## 📝 License

MIT © 2026
