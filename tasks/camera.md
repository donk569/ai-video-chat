# camera — Task Checklist

**Module**: camera (摄像头捕获 + 帧处理管线)
**Design reference**: detailed-design.md → Module: camera
**Dependencies**: shared (T-S01, T-S02)
**Estimated total time**: 1h 30min

---

## Tasks

### Capture

- [ ] **T-C01**: 实现 CameraPipeline — getUserMedia + Canvas 截帧
  - **AC**: `capture.ts` 导出 `requestCamera(constraints)` 函数返回 MediaStream；`startCapture(stream, canvas)` 函数持续截帧到 Canvas 返回 ImageData；错误时 throw 对应自定义错误（NotAllowedError → CameraPermissionDeniedError）；`stop()` 释放所有 track；包含 video 元素用于预览
  - **Depends on**: T-S01
  - **Est**: 25 min

- [ ] **T-C02**: 帧差去重
  - **AC**: `dedup.ts` 导出 `frameDiff(prev: ImageData, curr: ImageData): number` 计算像素差异百分比；`hasChanged(diffPercent, threshold): boolean` 判断是否变化；阈值默认 15%；返回差异值用于 debug 面板展示
  - **Depends on**: T-C01
  - **Est**: 20 min

- [ ] **T-C03**: 帧压缩（降分辨率 + JPEG）
  - **AC**: `compress.ts` 导出 `resizeFrame(canvas, targetW, targetH): Canvas` 降分辨率到 640px 宽；`compressToJPEG(canvas, quality): CompressedFrame` 输出含 dataUrl/width/height/sizeBytes/timestamp；默认 quality=0.6；压缩后 size 较原始减少 > 80%
  - **Depends on**: T-C01
  - **Est**: 20 min

### Integration

- [ ] **T-C04**: CameraPipeline 组装 + 低功耗模式
  - **AC**: `index.ts` 导出 CameraPipeline 类，组合 capture + dedup + compress；`captureFrame()` 完整走截帧→去重→压缩管线，无变化返 null；`setLowPower(boolean)` 切换帧率 (30fps ↔ 0.5fps)；单元测试覆盖：有变化返帧、无变化返 null、低功耗帧率切换
  - **Depends on**: T-C02, T-C03
  - **Est**: 25 min

---

## Completion Checklist

- [ ] All tasks checked off
- [ ] `npx vitest run __tests__/modules/camera.test.ts` passes
- [ ] `tsc --noEmit` passes for modules/camera/
- [ ] 在 Chrome 中手动验证：摄像头预览正常、移动画面时帧变化检测准确
