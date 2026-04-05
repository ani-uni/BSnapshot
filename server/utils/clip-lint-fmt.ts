import { HTTPError } from 'nitro/h3'

import type { Clips } from '../types/task'

export function ClipLintAndFmt(clips: Clips): Clips {
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
  // 检测交集
  clips.forEach((clip, index) => {
    if (index > 0) {
      const prevClip = clips[index - 1]
      if (!prevClip) return
      if (clip[0] < prevClip[1]) {
        throw new HTTPError(
          `Clips have intersection: [${prevClip[0]}, ${prevClip[1]}] and [${clip[0]}, ${clip[1]}]`,
          { status: 400 },
        )
      }
    }
  })
  return clips
}
