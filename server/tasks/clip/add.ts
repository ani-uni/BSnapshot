import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import { $Enums } from '~/generated/prisma/client'
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
  upMid?: bigint
  taskTypes?: Array<'RT' | 'HIS' | 'SP' | 'UP'>
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
  // 创建采集目标（Capture）及其片段
  const capture_c = await prisma.capture.create({
    data: {
      cid: payload.cid,
      pub: payload.pubdate ? new Date(payload.pubdate * 1000) : zeroDate,
      upMid: payload.upMid ?? null,
      clips: {
        create: clips.map((clip) => ({ start: clip[0], end: clip[1] })),
      },
      segs: clips2segs(clips).join(','),
    },
  })
  // 决定要创建哪些类型的任务
  const typesToCreate = payload.taskTypes
    ? payload.taskTypes
    : (['RT', 'HIS', 'SP', 'UP'] as const)

  const tasksData = []
  for (const type of typesToCreate) {
    // 如果是 UP 任务但没有 upMid，则跳过
    if (type === 'UP' && !payload.upMid) continue
    tasksData.push({
      cid: payload.cid,
      type: $Enums.TaskType[type],
      status: $Enums.TaskStatus.PENDING,
      nextRunAt: zeroDate,
      lastRunAt: zeroDate,
    })
  }

  if (tasksData.length > 0) {
    await prisma.fetchTask.createMany({ data: tasksData })
  }
  const capture = await prisma.capture
    .findUniqueOrThrow({
      where: { cid: capture_c.cid },
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
  return capture
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
