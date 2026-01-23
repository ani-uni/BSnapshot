import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { prisma } from '~/server/utils/prisma'

export interface TaskAuthUserGetPayload {
  mid: bigint
}

export type TaskAuthUserGetResult = UserModel

export default defineTask<TaskResult<TaskAuthUserGetResult>>({
  meta: {
    name: 'auth:user:get',
    description: 'Get user by mid',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserGetPayload> }) {
    if (!payload.mid) throw new HTTPError('Missing mid', { statusCode: 400 })
    const result = await AuthUserGet({ ...payload, mid: BigInt(payload.mid) })
    return bigint2string({ result })
  },
})

export async function AuthUserGet(
  payload: TaskAuthUserGetPayload,
): Promise<TaskAuthUserGetResult> {
  const res = await prisma.user
    .findUniqueOrThrow({
      where: { mid: payload.mid },
    })
    .catch((err) => {
      throw new HTTPError('User not found', { statusCode: 404, cause: err })
    })
  if (!res?.bauth_cookies) {
    await prisma.user.delete({ where: { mid: payload.mid } })
    throw new HTTPError('User not logged in', { statusCode: 500 })
  }
  return res
}
