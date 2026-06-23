/**
 * 帧差去重：逐像素比对两帧，返回变化像素百分比 (0–100)。
 */
export function frameDiff(prev: ImageData, curr: ImageData): number {
  if (prev.width !== curr.width || prev.height !== curr.height) {
    return 100;
  }

  const prevData = prev.data;
  const currData = curr.data;
  const totalPixels = prev.width * prev.height;
  let changedPixels = 0;

  for (let i = 0; i < prevData.length; i += 4) {
    // 仅比较 RGB，忽略 Alpha
    if (
      prevData[i] !== currData[i] ||
      prevData[i + 1] !== currData[i + 1] ||
      prevData[i + 2] !== currData[i + 2]
    ) {
      changedPixels++;
    }
  }

  return (changedPixels / totalPixels) * 100;
}

/**
 * 判断变化百分比是否达到阈值（默认 15%）。
 */
export function hasChanged(
  diffPercent: number,
  threshold: number = 15,
): boolean {
  return diffPercent >= threshold;
}
