# tts — Task Checklist

**Module**: tts (文字转语音)
**Design reference**: detailed-design.md → Module: tts
**Dependencies**: shared (T-S01, T-S02), api-routes (T-API03)
**Estimated total time**: 50 min

---

## Tasks

- [ ] **T-T01**: Web Speech Synthesis 封装
  - **AC**: `web-speech.ts` 导出 `createWebSpeechTTS(config)` 工厂函数；返回 `{ speak(text): Promise<TTSResult> }`；内部用 SpeechSynthesisUtterance API，lang/rate/pitch 可配置；speak() 返回 Promise，播报完成 resolve，错误 resolve null（触发 fallback）；支持 stop() 中断；`isSupported()` 检测浏览器兼容
  - **Depends on**: T-S01
  - **Est**: 20 min

- [ ] **T-T02**: 七牛云 TTS 客户端
  - **AC**: `qiniu-tts.ts` 导出 `callQiniuTTS(text): Promise<TTSResult>`；POST /api/tts，传入文本；接收 audio/mpeg 二进制，创建 Audio 元素播放；超时 15s throw TTSError；非 200 throw TTSError
  - **Depends on**: T-API03
  - **Est**: 15 min

- [ ] **T-T03**: TextToSpeech 组装 + fallback
  - **AC**: `index.ts` 导出 TextToSpeech 类；`speak(text)` 先调 Web Speech → 失败 → Qiniu TTS；`onEnd(cb)` 播报结束回调；`stop()` 中断；`isSpeaking()` 状态查询；单元测试：端侧成功、云端 fallback、双路失败
  - **Depends on**: T-T01, T-T02
  - **Est**: 15 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/tts.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/tts/
- [ ] 手动验证：AI 回答有声音播报，可中断
