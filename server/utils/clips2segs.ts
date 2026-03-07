import type { Clips } from "~s/types/task"

export const clips2segs = (
  clips: Clips,
  duration: number = Infinity,
): number[] => {
  const SEG_DURATION = 360 // 6分钟 = 360秒
  const segSet = new Set<number>()
  for (const [start, end] of clips) {
    // 计算起始和结束时间所在的seg编号（从1开始）
    const startSeg = Math.floor(start / SEG_DURATION) + 1
    const endSeg = Math.floor(Math.min(end, duration) / SEG_DURATION) + 1
    // 将范围内的所有seg加入集合
    for (let seg = startSeg; seg <= endSeg; seg++) segSet.add(seg)
  }
  // 返回排序后的seg数组
  return Array.from(segSet).sort((a, b) => a - b)
}
