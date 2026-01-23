import type { PromiseReturnType } from '@prisma/client/extension'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { prisma } from '~/server/utils/prisma'

export type TaskConfigGetResult = PromiseReturnType<typeof ConfigGet>

export default defineTask<TaskResult<TaskConfigGetResult>>({
  meta: {
    name: 'config:get',
    description: 'Get global config with id=0 (auto-create if missing)',
  },
  async run() {
    const res = await ConfigGet()
    return { result: bigint2string(res) }
  },
})

export async function ConfigGet() {
  const conf = await prisma.config
    .upsert({ where: { id: 0 }, update: {}, create: { id: 0 } })
    .catch((err: Error) => {
      throw new HTTPError('Config not available', {
        statusCode: 500,
        cause: err,
      })
    })
  const runtime = await prisma.runtime
    .upsert({ where: { id: 0 }, update: {}, create: { id: 0 } })
    .catch((err: Error) => {
      throw new HTTPError('Runtime not available', {
        statusCode: 500,
        cause: err,
      })
    })

  return { conf, runtime }
}
