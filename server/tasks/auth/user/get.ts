import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~s/types/tasks/payload'
import type { TaskResult } from '~s/types/tasks/result'
import { User } from '~s/utils/common/user'

import type { UserModel } from '~/generated/prisma/models'

export interface TaskAuthUserGetPayload {
  mid: bigint
}

export type TaskAuthUserGetResult = User

export default defineTask<TaskResult<UserModel>>({
  meta: {
    name: 'auth:user:get',
    description: 'Get user by mid',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserGetPayload> }) {
    if (!payload.mid) throw new HTTPError('Missing mid', { status: 400 })
    const result = (
      await AuthUserGet({ ...payload, mid: BigInt(payload.mid) })
    ).toJSON()
    return { result }
  },
})

export async function AuthUserGet(
  payload: TaskAuthUserGetPayload,
): Promise<TaskAuthUserGetResult> {
  const res = await User.fromMid(payload.mid)
  return res
}
