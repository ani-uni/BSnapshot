import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { TaskPayload } from '~/server/types/tasks/payload'
import { prisma } from '~/server/utils/prisma'

export interface TaskAuthUserGetPayload {
  mid: string // bigint
}

export type TaskAuthUserGetResult = Omit<UserModel, 'mid'> & { mid: string }

export default defineTask<TaskAuthUserGetResult>({
  meta: {
    name: 'auth:user:get',
    description: 'Get user by mid',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserGetPayload> }) {
    if (!payload.mid) throw new HTTPError('Missing mid', { statusCode: 400 })
    const result = await AuthUserGet(payload as TaskAuthUserGetPayload)
    return { result }
  },
})

export async function AuthUserGet(
  payload: TaskAuthUserGetPayload,
): Promise<TaskAuthUserGetResult> {
  const res = await prisma.user
    .findUniqueOrThrow({
      where: { mid: BigInt(payload.mid) },
    })
    .catch((err) => {
      throw new HTTPError('User not found', { statusCode: 404, cause: err })
    })
  if (!res?.bauth_cookies) {
    await prisma.user.delete({ where: { mid: BigInt(payload.mid) } })
    throw new HTTPError('User not logged in', { statusCode: 500 })
  }
  const result = { ...res, mid: res.mid.toString() }
  return result
}
