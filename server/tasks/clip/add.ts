import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { clips2segs } from '~/server/utils/clips2segs'
import { prisma } from '~/server/utils/prisma'

type Clip = [number, number]

export interface TaskClipAddPayload {
  clips: Clip[]
  cid: bigint
  pubdate?: number
}

export type TaskClipAddResult = PromiseReturnType<typeof ClipAdd>

export default defineTask<TaskResult<TaskClipAddResult>>({
  meta: {
    name: 'clip:add',
    description: 'Add a task to create clips',
  },
  async run({ payload }: { payload: TaskPayload<TaskClipAddPayload> }) {
    if (!payload.clips || !payload.cid) {
      throw new HTTPError('Invalid payload', { statusCode: 400 })
    }
    const res = await ClipAdd({
      cid: BigInt(payload.cid),
      clips: payload.clips,
    })
    return { result: bigint2string(res) }
  },
})

export async function ClipAdd(payload: TaskClipAddPayload) {
  const clips = ClipLintAndFmt(payload.clips)
  const zeroDate = new Date(0)
  const task_c = await prisma.task.create({
    data: {
      cid: payload.cid,
      pub: payload.pubdate ? new Date(payload.pubdate * 1000) : zeroDate,
      clips: {
        create: clips.map((clip) => ({ start: clip[0], end: clip[1] })),
      },
      segs: clips2segs(clips).join(','),
      rtRunAt: zeroDate,
      hisRunAt: zeroDate,
      spRunAt: zeroDate,
      upRunAt: zeroDate,
    },
  })
  const task = await prisma.task
    .findUniqueOrThrow({
      where: { cid: task_c.cid },
      include: {
        clips: true,
      },
    })
    .catch((err: Error) => {
      throw new HTTPError('Failed to create clip task', {
        statusCode: 500,
        cause: err,
      })
    })
  return task
}

export function ClipLintAndFmt(clips: TaskClipAddPayload['clips']): Clip[] {
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
