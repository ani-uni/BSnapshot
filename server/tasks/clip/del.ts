import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { prisma } from '~/server/utils/prisma'

export interface TaskClipDelPayload {
  cid: bigint
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
    const res = await ClipDel({ cid: BigInt(payload.cid) })
    return { result: bigint2string(res) }
  },
})

export async function ClipDel(payload: TaskClipDelPayload) {
  const task = await prisma.task.delete({
    where: { cid: payload.cid },
  })
  return task
}
