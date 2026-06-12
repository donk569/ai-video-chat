# api-routes — Task Checklist

**Module**: Next.js API Routes (云端 API 代理，隐藏 Key)
**Design reference**: detailed-design.md → app/api/
**Dependencies**: shared (T-S01, T-S02)
**Estimated total time**: 50 min

---

## Tasks

- [ ] **T-API01**: 七牛云 ASR 代理路由
  - **AC**: `app/api/asr/route.ts` — POST 接收 audio Blob (FormData)，转发到七牛云 ASR API；环境变量 `QINIU_ASR_URL` + `QINIU_API_KEY` 配置；返回 `{ text, confidence }`；超时 15s；错误时返回 `{ error: string, code: number }` 不泄露 Key；Content-Type 校验
  - **Depends on**: T-S02
  - **Est**: 20 min

- [ ] **T-API02**: 七牛云 VLM 代理路由
  - **AC**: `app/api/vlm/route.ts` — POST 接收 `{ image: base64, question: string }`，转发到七牛云 VLM API；返回 `{ answer, tokensUsed }`；超时 30s；图片 base64 大小 > 500KB 时返回 413 错误
  - **Depends on**: T-S02
  - **Est**: 20 min

- [ ] **T-API03**: 七牛云 TTS 代理路由
  - **AC**: `app/api/tts/route.ts` — POST 接收 `{ text: string }`，转发到七牛云 TTS API；返回 audio/mpeg 二进制流；超时 15s；文本长度 > 500 字截断
  - **Depends on**: T-S02
  - **Est**: 10 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `tsc --noEmit` passes for app/api/
- [ ] 用 curl/Postman 测试每个端点返回预期响应
- [ ] 确认 API Key 不出现在前端 bundle 中
