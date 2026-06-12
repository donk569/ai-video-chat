# orchestrator — Task Checklist

**Module**: orchestrator (会话引擎)
**Design reference**: detailed-design.md → Module: orchestrator
**Dependencies**: camera (T-C04), audio (T-A03), asr (T-ASR03), vlm (T-V04), tts (T-T03)
**Estimated total time**: 1h 30min

---

## Tasks

- [ ] **T-O01**: 状态机
  - **AC**: `state-machine.ts` 导出状态机：IDLE → LISTENING → THINKING → SPEAKING → IDLE；任意状态可触发 ERROR → (重置) → IDLE；状态转换可注册回调；非法转换（如 LISTENING → SPEAKING 跳过 THINKING）断言报错；暴露 getState() + onTransition(cb)
  - **Depends on**: T-S01
  - **Est**: 20 min

- [ ] **T-O02**: 主管线 (Pipeline)
  - **AC**: `pipeline.ts` 导出 `ConversationPipeline` 类；`processVoiceInput(audioChunk)` 走完整链路：AudioChunk → SpeechRecognizer → 文本 + CameraPipeline.captureFrame() → VisionLanguageModel → TextToSpeech；每一步捕获异常，任一失败不影响管线继续（能降级就降级）；返回 `{userText, aiAnswer, sources: {asr, vlm, tts}}`
  - **Depends on**: T-O01
  - **Est**: 30 min

- [ ] **T-O03**: 低功耗管理
  - **AC**: `power-saver.ts` 导出 `PowerSaver` 类；IDLE 状态 10s 无交互 → 调用 camera.setLowPower(true)；LISTENING/THINKING/SPEAKING 自动恢复正常帧率；计时器用 requestAnimationFrame 驱动避免后台暂停时继续计时；10s 计时精确度 ± 200ms
  - **Depends on**: T-O01, T-C04
  - **Est**: 15 min

- [ ] **T-O04**: Orchestrator 组装 + 成本统计
  - **AC**: `index.ts` 导出 Orchestrator 类注入全部依赖；`start()` 启动 camera + audio + 管线；`stop()` 全部释放；`onEvent(cb)` 分发 ConversationEvent；`getCostStats()` 汇总 cloudASRCalls/cloudVLMCalls/cloudTTSCalls/totalTokensUsed/estimatedCostRMB；`submitText(text)` P2 入口；单元测试：全 mock 依赖验证管线调用顺序、状态流转、成本累加
  - **Depends on**: T-O02, T-O03
  - **Est**: 25 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/orchestrator.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/orchestrator/
- [ ] 手动验证：说话→识别→回答→播报，全流程无卡顿
