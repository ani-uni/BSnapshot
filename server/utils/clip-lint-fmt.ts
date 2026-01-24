import { HTTPError } from 'nitro/h3'
import type { Clip } from '../types/task'

export function ClipLintAndFmt(clips: Clip[]): Clip[] {
  if (clips.length === 0) return []
  // 检查是否有无效的 clip（开始时间 >= 结束时间）
  for (const clip of clips) {
    if (clip[0] >= clip[1]) {
      throw new HTTPError(
        `Invalid clip: start time (${clip[0]}) must be less than end time (${clip[1]})`,
        { statusCode: 400 },
      )
    }
  }
  // 按开始时间增序排序
  clips.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  // 合并有交集的片段
  return clips.reduce<Clip[]>((merged, current) => {
    const lastClip = merged[merged.length - 1]
    if (!lastClip) {
      merged.push(current)
      return merged
    }
    // 检查是否存在交集（当前片段的开始时间小于等于上一个片段的结束时间）
    if (current[0] <= lastClip[1]) {
      // 合并：扩展结束时间到两者中较大的那个
      lastClip[1] = Math.max(lastClip[1], current[1])
    } else {
      // 无交集，添加为新片段
      merged.push(current)
    }
    return merged
  }, [])
}
