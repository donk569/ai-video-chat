# audio — Task Checklist

**Module**: audio (麦克风捕获 + VAD)
**Design reference**: detailed-design.md → Module: audio
**Dependencies**: shared (T-S01, T-S02)
**Estimated total time**: 1h 10min

---

## Tasks

### Capture

- [ ] **T-A01**: Web Audio API 录音
  - **AC**: `capture.ts` 导出 `requestMicrophone()` 返回 MediaStream + AudioContext；`startRecording(ctx, stream)` 创建 ScriptProcessorNode 持续输出 Float32Array 音频数据；回调方式传递音频 buffer；`stop()` 释放所有资源（track.stop + ctx.close）；权限拒绝 throw MicPermissionDeniedError
  - **Depends on**: T-S01
  - **Est**: 25 min

- [ ] **T-A02**: VAD 静音检测 + 音频分段
  - **AC**: `vad.ts` 导出 `computeRMS(buffer: Float32Array): number` 计算均方根音量；`detectSpeech(rms, threshold): boolean` (threshold 默认 0.02)；`AudioChunker` 类：累积有语音帧、静音超 1.5s 后切段输出 AudioChunk {blob, durationMs, hasSpeech: true}；纯静音段丢弃不输出；chunk 最大 10s 自动切段
  - **Depends on**: T-A01
  - **Est**: 25 min

### Integration

- [ ] **T-A03**: AudioCapture 组装
  - **AC**: `index.ts` 导出 AudioCapture 类组合 capture + chunker；`start()` 启动录音管线；`onChunk(cb)` 注册回调；`isSpeaking()` 返回当前语音状态；单元测试验证：VAD 阈值判断、静音段丢弃、超时切段
  - **Depends on**: T-A02
  - **Est**: 20 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/audio.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/audio/
- [ ] 手动验证：说话时 VAD 灯亮、静音自动切段
