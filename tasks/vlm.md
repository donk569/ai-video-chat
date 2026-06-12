# vlm — Task Checklist

**Module**: vlm (视觉语言模型)
**Design reference**: detailed-design.md → Module: vlm
**Dependencies**: shared (T-S01, T-S02), camera (T-C04), api-routes (T-API02)
**Estimated total time**: 1h 30min

---

## Tasks

- [ ] **T-V01**: LRU 答案缓存
  - **AC**: `cache.ts` 导出 `LRUCache<VLMResponse>` 类；`get(key: string): VLMResponse | null`；`set(key: string, value: VLMResponse): void`；容量可配置（默认 100），超出淘汰最久未用；key 由 text + frame 缩略图 hash 组成（非精确匹配，模糊 hash 容忍轻微画面差异）；`getStats()` 返回 size + hitRate
  - **Depends on**: T-S01
  - **Est**: 25 min

- [ ] **T-V02**: Transformers.js 本地模型推理
  - **AC**: `local-model.ts` 导出 `LocalVLM` 类；`preload()` 预热模型（下载权重）；`query(text, imageDataUrl): Promise<string | null>` 用 Transformers.js 的 image-to-text pipeline 推理；5s 超时，超时返 null（触发云端 fallback）；模型不支持当前浏览器时 `isSupported()` 返 false；模型选最小可用版本（如 onnx 量化版），控制下载体积
  - **Depends on**: T-S01
  - **Est**: 30 min

- [ ] **T-V03**: 七牛云 VLM 客户端
  - **AC**: `qiniu-vlm.ts` 导出 `callQiniuVLM(imageBase64, question, history?): Promise<VLMResponse>`；POST /api/vlm，传入图片+问题+可选历史；返回 `{ answer, tokensUsed }`；超时 30s throw VLMTimeoutError；非 200 throw VLMAPIError；token 消耗计入 CostStats
  - **Depends on**: T-API02
  - **Est**: 15 min

- [ ] **T-V04**: VisionLanguageModel 组装 + 三级 fallback
  - **AC**: `index.ts` 导出 VisionLanguageModel 类；`query(input)` 先查缓存 → 未命中 → 本地模型 → 返回 null/失败 → 云端 API；每一步记录 source + latencyMs；`preloadModel()` 后台预热本地模型；单元测试覆盖：缓存命中、本地成功、云端 fallback、全链路失败
  - **Depends on**: T-V01, T-V02, T-V03
  - **Est**: 20 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/vlm.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/vlm/
- [ ] 手动验证：摄像头对准物体 → 提问 → 回答正确，source 标注
