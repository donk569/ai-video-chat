'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

function GridBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px]" />
    </div>
  );
}

const features = [
  { icon: '🎤', title: '语音对话', desc: '开口即聊，AI 实时倾听并用语音回应' },
  { icon: '💬', title: '文字交流', desc: '不想说话？打字也能流畅对话' },
  { icon: '📹', title: '实时画面', desc: '摄像头捕捉，AI 理解你所处的环境' },
  { icon: '⚡', title: '打断即停', desc: '说话或打字时 AI 自动停止播报，随时打断' },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <GridBg />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30" />
          <span className="text-lg font-semibold tracking-tight">AI Vision Chat</span>
        </div>
        <Link
          href="/chat"
          className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
          开始对话 →
        </Link>
      </nav>

      {/* Hero */}
      <section
        className={`relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-3xl mx-auto transition-all duration-1000 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          七牛云 × 端云协同
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          用<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400">视觉</span>
          <br />
          重新定义对话
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
          打开摄像头，AI 看见你的世界。
          <br />
          开口即聊，AI 听懂你的声音。
          <br />
          端侧优先，云端兜底，极致低成本。
        </p>

        <Link
          href="/chat"
          className="group relative px-8 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:scale-105 transition-all duration-300 shadow-2xl shadow-cyan-500/20"
        >
          <span className="relative z-10">免费体验</span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500"
            >
              <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
              <h3 className="text-sm font-semibold mb-1 text-zinc-200">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cost Funnel Visual */}
      <section className={`relative z-10 max-w-2xl mx-auto px-6 pb-24 transition-all delay-300 duration-1000 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <h2 className="text-center text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-8">六层成本漏斗</h2>
        <div className="space-y-2">
          {[
            { label: '原始 30fps', reduction: '—', color: 'from-red-500/20 to-red-500/5', text: 'text-red-400' },
            { label: '低功耗 0.5fps', reduction: '60x', color: 'from-orange-500/20 to-orange-500/5', text: 'text-orange-400' },
            { label: '帧差去重', reduction: '10x', color: 'from-yellow-500/20 to-yellow-500/5', text: 'text-yellow-400' },
            { label: '降分辨率 640px', reduction: '5x', color: 'from-green-500/20 to-green-500/5', text: 'text-green-400' },
            { label: 'JPEG 压缩 q=0.6', reduction: '10x', color: 'from-cyan-500/20 to-cyan-500/5', text: 'text-cyan-400' },
            { label: '答案缓存 + 本地模型', reduction: '∞', color: 'from-blue-500/20 to-blue-500/5', text: 'text-blue-400' },
          ].map((layer, i) => (
            <div
              key={layer.label}
              className="group flex items-center justify-between px-5 py-3 rounded-xl bg-gradient-to-r border border-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
              style={{
                background: `linear-gradient(90deg, rgba(255,255,255,${0.02 + i * 0.015}) 0%, rgba(255,255,255,0.01) 100%)`,
                width: `${100 - i * 10}%`,
              }}
            >
              <span className="text-sm text-zinc-300">{layer.label}</span>
              <span className={`text-xs font-mono font-bold ${layer.text}`}>{layer.reduction}</span>
            </div>
          ))}
          <div className="flex items-center justify-center pt-4">
            <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
              ↓ 仅必要时才上云
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 text-xs text-zinc-600">
        Built with Next.js · 七牛云 AI · Web Speech API
      </footer>
    </div>
  );
}
