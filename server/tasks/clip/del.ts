import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { $Enums } from '~/generated/prisma/client'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { prisma } from '~/server/utils/prisma'

export interface TaskClipDelPayload {
  cid: bigint
  // 可选：仅删除指定类型的 FetchTask，缺省则删除整个 capture（级联删除所有任务与片段）
  taskTypes?: Array<'RT' | 'HIS' | 'SP' | 'UP'>
}

export type TaskClipDelResult = PromiseReturnType<typeof ClipDel>

export default defineTask<TaskResult<TaskClipDelResult>>({
  meta: {
    name: 'clip:del',
    description: 'Delete a task to remove clips',
  },
  async run({ payload }: { payload: TaskPayload<TaskClipDelPayload> }) {
    if (!payload.cid) {
      throw new HTTPError('Invalid payload', { statusCode: 400 })
    }
    const res = await ClipDel({
      cid: BigInt(payload.cid),
      taskTypes: payload.taskTypes,
    })
    return { result: bigint2string(res) }
  },
})

export async function ClipDel(payload: TaskClipDelPayload) {
  // 如果指定了 taskTypes，则仅删除对应的 FetchTask；否则删除整个 capture（级联删除 clips、tasks）
  if (payload.taskTypes?.length) {
    const result = await prisma.fetchTask.deleteMany({
      where: {
        cid: payload.cid,
        type: { in: payload.taskTypes as $Enums.TaskType[] },
      },
    })
    return result
  }

  const capture = await prisma.capture.delete({
    where: { cid: payload.cid },
  })
  return capture
}
