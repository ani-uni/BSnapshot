import { HTTPError } from 'nitro/h3'
import type { ClipSimple, Clips } from '../types/task'

export function ClipLintAndFmt(clips: Clips): ClipSimple[] {
  if (clips.length === 0) return []
  // 检查是否有无效的 clip（开始时间 >= 结束时间）
  for (const clip of clips) {
    if (clip[0] >= clip[1]) {
      throw new HTTPError(
        `Invalid clip: start time (${clip[0]}) must be less than end time (${clip[1]})`,
        { status: 400 },
      )
    }
  }
  // 按开始时间增序排序
  clips.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  // 合并有交集的片段
  return clips.reduce<Clips>((merged, current) => {
    const lastClip = merged[merged.length - 1]
    if (!lastClip) {
      merged.push(current)
      return merged
    }
    // 检查上一个片段是否标记为需要合并，或者存在交集
    const shouldMerge = !lastClip[2] && current[0] <= lastClip[1]
    if (shouldMerge) {
      // 合并：扩展结束时间到两者中较大的那个
      lastClip[1] = Math.max(lastClip[1], current[1])
    } else {
      // 无交集且不需要合并，添加为新片段
      merged.push(current)
    }
    return merged
  }, [])
}
