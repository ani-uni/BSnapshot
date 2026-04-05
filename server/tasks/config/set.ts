import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~s/types/tasks/payload'
import type { TaskResult } from '~s/types/tasks/result'
import { prisma } from '~s/utils/prisma'

import type { Config } from '~/generated/prisma/client'
import type { ConfigModel } from '~/generated/prisma/models'

export type TaskConfigSetPayload = TaskPayload<Omit<Config, 'id'>>

export type TaskConfigSetResult = ConfigModel

export default defineTask<TaskResult<TaskConfigSetResult>>({
  meta: {
    name: 'config:set',
    description: 'Update global config (id=0); creates if missing',
  },
  async run({ payload }: { payload: TaskPayload<TaskConfigSetPayload> }) {
    const res = await ConfigSet(payload ?? {})
    return { result: res }
  },
})

export async function ConfigSet(payload: TaskConfigSetPayload) {
  const conf = await prisma.config
    .upsert({
      where: { id: 0 },
      update: payload,
      create: { id: 0, ...payload },
    })
    .catch((err: Error) => {
      throw new HTTPError('Config update failed', {
        status: 500,
        cause: err,
      })
    })

  return conf
}
