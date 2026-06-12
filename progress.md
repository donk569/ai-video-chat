# AI 视觉对话助手 — Overall Progress

**Last updated**: 2026-06-12
**Total modules**: 10
**Modules completed**: 0/10

## Module Progress

| Module | Status | Tasks Done | Test Pass | Type Check | Lint |
|--------|--------|------------|-----------|------------|------|
| [shared](tasks/shared.md) | ⬜ Not started | 0/2 | — | — | — |
| [camera](tasks/camera.md) | ⬜ Not started | 0/4 | — | — | — |
| [audio](tasks/audio.md) | ⬜ Not started | 0/3 | — | — | — |
| [api-routes](tasks/api-routes.md) | ⬜ Not started | 0/3 | — | — | — |
| [asr](tasks/asr.md) | ⬜ Not started | 0/3 | — | — | — |
| [vlm](tasks/vlm.md) | ⬜ Not started | 0/4 | — | — | — |
| [tts](tasks/tts.md) | ⬜ Not started | 0/3 | — | — | — |
| [orchestrator](tasks/orchestrator.md) | ⬜ Not started | 0/4 | — | — | — |
| [ui](tasks/ui.md) | ⬜ Not started | 0/8 | — | — | — |
| [integration](tasks/integration.md) | ⬜ Not started | 0/4 | — | — | — |

**Total tasks**: 38

## Build Order (Dependency Graph)

```
Phase 1: Foundation
  shared ───────────────────── (no deps)
    │
Phase 2: I/O Layer
  camera ───── audio ───── api-routes
    │           │              │
Phase 3: Service Layer         │
  ├──────────── asr ◄──────────┤
  │   vlm ◄───┘               │
  │   tts ◄────────────────────┘
    │
Phase 4: Orchestration
  orchestrator ◄── camera + audio + asr + vlm + tts
    │
Phase 5: Presentation
  ui ◄── orchestrator + camera
    │
Phase 6: Ship
  integration ◄── ALL
```

## Milestones

- [ ] **M1: Foundation Ready** — shared + camera + audio 完成，摄像头画面可预览
  - **Depends on**: shared, camera, audio
  - **Files**: 3 modules, 9 tasks

- [ ] **M2: AI Pipeline Ready** — asr + vlm + tts + api-routes 完成，问答链路跑通
  - **Depends on**: M1, api-routes, asr, vlm, tts
  - **Files**: 7 modules, 22 tasks

- [ ] **M3: Full App Working** — orchestrator + ui 完成，全流程可交互
  - **Depends on**: M2, orchestrator, ui
  - **Files**: 9 modules, 34 tasks

- [ ] **M4: Ship Ready** — integration + README + 设计文档 + demo 视频完成
  - **Depends on**: M3, integration
  - **Files**: 10 modules, 38 tasks

## Quality Gates (Global)

- [ ] All 38 tasks checked off
- [ ] `npx vitest run` — full suite passes, coverage > 70%
- [ ] `npx tsc --noEmit` — zero type errors (strict)
- [ ] `npx eslint .` — zero lint errors
- [ ] `pnpm build` — production build success
- [ ] `pnpm dev` — one-command launch works
- [ ] README + DESIGN.md present and complete
- [ ] Demo video link in README, video playable
- [ ] GitHub repo public, PR history clean, commits continuous
