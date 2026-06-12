# integration — Task Checklist

**Module**: 集成测试 + 收尾
**Design reference**: proposal.md 比赛约束
**Dependencies**: ALL modules complete
**Estimated total time**: 1h 30min

---

## Tasks

- [ ] **T-I01**: 端到端集成测试
  - **AC**: `__tests__/integration/full-pipeline.test.ts` — mock 摄像头+麦克风输入，验证从 AudioChunk 到 TTS.play 的完整链路；验证三级 fallback（端侧→云端）；验证缓存命中；验证低功耗模式帧率切换；覆盖率 > 70%
  - **Depends on**: T-O04, T-U08
  - **Est**: 30 min

- [ ] **T-I02**: README 文档
  - **AC**: 含：项目简介（一句话 + demo 截图）、功能列表（P0/P2 标注）、技术栈、快速开始（`pnpm install && pnpm dev`）、环境变量说明（QINIU_API_KEY 等）、目录结构、demo 视频链接、依赖清单（第三方库及用途说明、原创功能说明）；中英双语
  - **Depends on**: T-I01
  - **Est**: 25 min

- [ ] **T-I03**: 设计文档（比赛要求）
  - **AC**: 独立 `DESIGN.md`，包含两部分：① 用户故事 — 计划实现 vs 实际实现清单，逐条标注完成度；② 成本控制技巧 — 规划技巧 vs 实际采用，标注实测节省比例；格式参考 proposal.md 比赛约束部分
  - **Depends on**: T-I01
  - **Est**: 20 min

- [ ] **T-I04**: 部署 + 最终验证
  - **AC**: `pnpm build` 无错误；`pnpm dev` 一键启动可用；所有质量门禁通过（vitest / tsc / eslint）；录制 demo 视频链接放入 README；GitHub 仓库公开可访问
  - **Depends on**: T-I02, T-I03
  - **Est**: 15 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run` full suite green
- [ ] `npx tsc --noEmit` zero errors
- [ ] `npx eslint .` zero errors
- [ ] `pnpm build` success
- [ ] README + DESIGN.md 完整
- [ ] Demo 视频可播放
