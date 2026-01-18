import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { clips2segs } from '~/server/utils/clips2segs'
import { prisma } from '~/server/utils/prisma'

export interface TaskClipRunPayload {
  cid: bigint
}

export type TaskClipRunResult = PromiseReturnType<typeof ClipRun>

export default defineTask<TaskClipRunResult>({
  meta: {
    name: 'clip:run',
    description: 'Run a task and its clips',
  },
  async run({ payload }: { payload: TaskPayload<TaskClipRunPayload> }) {
    // if (!payload.clips || !payload.cid) {
    //   throw new HTTPError('Invalid payload', { statusCode: 400 })
    // }
    // const res = await ClipAdd({
    //   cid: BigInt(payload.cid),
    //   clips: payload.clips,
    // })
    // return { result: bigint2string(res) }
  },
})

export async function ClipRun(payload: TaskClipRunPayload) {
  const conf = await prisma.config.findFirstOrThrow().catch((err: Error) => {
    throw new HTTPError('Config not found', { statusCode: 500, cause: err })
  })
  const task = {
    rt: await prisma.task.findMany({
      where: {
        cid: payload.cid,
        rtStatus: 'PENDING',
        rtRunAt: { lte: new Date(Date.now() - conf.rtInterval * 1000) },
      },
    }),
    his: await prisma.task.findMany({
      where: {
        cid: payload.cid,
        hisStatus: 'PENDING',
        hisRunAt: { gt: new Date(Date.now() - conf.hisInterval * 1000) },
      },
      take: conf.hisBatchNum,
    }),
    sp: await prisma.task.findMany({
      where: {
        cid: payload.cid,
        spStatus: 'PENDING',
        spRunAt: { lte: new Date(Date.now() - conf.spInterval * 1000) },
      },
    }),
    up: await prisma.task.findMany({
      where: {
        cid: payload.cid,
        upStatus: 'PENDING',
        upRunAt: { lte: new Date(Date.now() - conf.upInterval * 1000) },
      },
    }),
  }
  return task
}
