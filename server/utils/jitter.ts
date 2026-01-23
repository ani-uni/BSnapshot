/**
 * 为间隔时间添加随机抖动，避免同时执行
 * @param intervalMs 基础间隔时间（毫秒）
 * @param jitterPercent 抖动百分比（默认10%）
 * @returns 加上抖动后的间隔时间（毫秒）
 */
export function addJitter(
  intervalMs: number,
  jitterPercent: number = 10,
): number {
  const jitterAmount = intervalMs * (jitterPercent / 100)
  const randomOffset = (Math.random() - 0.5) * 2 * jitterAmount
  return Math.max(intervalMs / 2, intervalMs + randomOffset)
}
