# shared — Task Checklist

**Module**: shared (类型定义 + 配置 + 错误类)
**Design reference**: detailed-design.md → Module: shared
**Dependencies**: none
**Estimated total time**: 45 min

---

## Tasks

### Types & Config

- [ ] **T-S01**: 定义所有共享 TypeScript 类型
  - **AC**: `shared/types.ts` 包含 CameraConfig, CompressedFrame, AudioConfig, AudioChunk, ASRResult, VLMQuery, VLMResponse, TTSResult, ConversationState, ConversationEvent, CostStats, Message 类型定义；所有类型通过 `tsc --noEmit` 检查；类型注释完整无 `any`
  - **Depends on**: none
  - **Est**: 20 min

- [ ] **T-S02**: 创建配置常量 + 自定义错误类
  - **AC**: `shared/config.ts` 导出 CONFIG 对象含所有阈值（摄像头分辨率、帧率、JPEG质量、VAD阈值、超时等），可环境变量覆盖 API URL；`shared/errors.ts` 导出 CameraPermissionDeniedError, NoCameraError, MicPermissionDeniedError, NoMicrophoneError, AudioContextError, ASRTimeoutError, ASRAPIError, VLMTimeoutError, VLMAPIError, TTSError 等自定义错误类；每个错误类含中文友好消息
  - **Depends on**: T-S01
  - **Est**: 25 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `tsc --noEmit` passes for shared/
- [ ] All types exported and importable by other modules
