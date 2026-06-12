# asr — Task Checklist

**Module**: asr (语音识别)
**Design reference**: detailed-design.md → Module: asr
**Dependencies**: shared (T-S01, T-S02), audio (T-A03), api-routes (T-API01)
**Estimated total time**: 1h

---

## Tasks

- [ ] **T-ASR01**: Web Speech API 封装
  - **AC**: `web-speech.ts` 导出 `createWebSpeechRecognizer(config)` 工厂函数；返回 `{ recognize(audio): Promise<ASRResult> }`；内部用 SpeechRecognition API，lang 可配置，interimResults=false；识别完成 resolve，error/no-match 时 resolve null（触发 fallback）；支持 abort() 中断；封装浏览器差异
  - **Depends on**: T-S01
  - **Est**: 25 min

- [ ] **T-ASR02**: 七牛云 ASR 客户端
  - **AC**: `qiniu-asr.ts` 导出 `callQiniuASR(audioBlob): Promise<ASRResult>`；POST /api/asr，传入 audio Blob；解析响应为 ASRResult { text, confidence, source: 'qiniu' }；超时 15s 后 throw ASRTimeoutError；非 200 响应 throw ASRAPIError
  - **Depends on**: T-API01
  - **Est**: 15 min

- [ ] **T-ASR03**: SpeechRecognizer 组装 + fallback 逻辑
  - **AC**: `index.ts` 导出 SpeechRecognizer 类；`recognize(chunk)` 先调 Web Speech → 返回 null/失败 → 调 Qiniu ASR；记录 latencyMs；`isSupported()` 检测浏览器兼容性；单元测试覆盖：Web Speech 成功不走云端、Web Speech 失败走云端、双路都失败抛错
  - **Depends on**: T-ASR01, T-ASR02
  - **Est**: 20 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/asr.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/asr/
- [ ] 手动验证：说话 → 文字正确显示，source 标注
