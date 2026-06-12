# ui — Task Checklist

**Module**: React Components + Hooks + 页面
**Design reference**: detailed-design.md → components/ + hooks/
**Dependencies**: orchestrator (T-O04), camera (T-C04)
**Estimated total time**: 2h 30min

---

## Tasks

### Hooks

- [ ] **T-U01**: useCamera hook
  - **AC**: `hooks/useCamera.ts` 导出返回 `{ stream, isActive, error, start(), stop() }`；封装 CameraPipeline 生命周期（useEffect 清理）；error 自动映射为中文提示（权限拒绝→显示 PermissionGate）；支持依赖注入 CameraPipeline 实例（测试友好）
  - **Depends on**: T-C04
  - **Est**: 20 min

- [ ] **T-U02**: useOrchestrator hook
  - **AC**: `hooks/useOrchestrator.ts` 导出返回 `{ state, messages, costStats, start(), stop(), submitText() }`；初始化 Orchestrator 实例并注册 onEvent 回调；messages 累积用户+AI 消息数组；state 实时同步 ConversationState；组件卸掛时自动 stop()
  - **Depends on**: T-O04
  - **Est**: 25 min

### Core Components

- [ ] **T-U03**: CameraPreview 组件
  - **AC**: 渲染 `<video>` 显示摄像头实时画面（镜像翻转 selfie）；无权限时显示 PermissionGate 引导；低帧率模式半透明遮罩提示；支持全屏；Canvas 隐藏（仅用于截帧不显示）
  - **Depends on**: T-U01
  - **Est**: 20 min

- [ ] **T-U04**: StatusIndicator 组件
  - **AC**: 四个状态动画：IDLE（灰色圆点）、LISTENING（绿色波纹扩散动画）、THINKING（蓝色旋转 loading）、SPEAKING（黄色声波动画）、ERROR（红色闪烁+错误信息）；CSS transition 平滑切换；含当前来源标注（Web Speech / Qiniu / Cache / Local）
  - **Depends on**: T-U02
  - **Est**: 20 min

- [ ] **T-U05**: ChatBubble + ConversationPanel 组件
  - **AC**: ChatBubble 渲染单条消息（用户/助手），含文本 + 可选截图缩略图、时间戳、处理来源 badge；ConversationPanel 渲染消息列表，自动滚动到底部；消息 > 100 条时保留最新 50 条防内存泄漏
  - **Depends on**: T-U02
  - **Est**: 20 min

- [ ] **T-U06**: Controls 组件
  - **AC**: 开始/停止按钮（状态机驱动文本切换）；静音按钮（TTS 静音）；文字输入框（P2 fallback，ENTER 发送）；低功耗模式指示灯；底部固定栏，移动端安全区适配
  - **Depends on**: T-U02
  - **Est**: 20 min

- [ ] **T-U07**: DebugPanel 组件（可折叠）
  - **AC**: 显示：当前帧率、帧差百分比、压缩前后大小、VAD 音量值、ASR 延迟、VLM source + 延迟 + token 数、TTS source、累计成本估算；折叠时显示总 token/成本小标签；所有数据从 Orchestrator.onEvent 获取
  - **Depends on**: T-U02
  - **Est**: 25 min

### Page Assembly

- [ ] **T-U08**: 主页面 + layout
  - **AC**: `app/page.tsx` 组合所有组件：CameraPreview（全屏背景）+ ConversationPanel（左下浮动）+ StatusIndicator（顶栏）+ Controls（底栏）+ DebugPanel（右上可折叠）；`app/layout.tsx` 设置 viewport meta（移动端适配）、标题、favicon；Tailwind 响应式布局（桌面为主，移动端竖向堆叠）
  - **Depends on**: T-U03 ~ T-U07
  - **Est**: 20 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/components/` passes
- [ ] `tsc --noEmit` passes
- [ ] 手动验证：Chrome 打开 localhost:3000，全流程可用
