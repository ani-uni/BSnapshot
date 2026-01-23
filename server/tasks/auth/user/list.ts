import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { prisma } from '~/server/utils/prisma'

export type TaskAuthUserListResult = Omit<UserModel, 'bauth_cookies'>[]

export default defineTask<TaskResult<TaskAuthUserListResult>>({
  meta: {
    name: 'auth:user:list',
    description: 'List all users',
  },
  async run() {
    const result = await AuthUserList()
    return bigint2string({ result })
  },
})

export async function AuthUserList(): Promise<TaskAuthUserListResult> {
  const result = await prisma.user.findMany({ omit: { bauth_cookies: true } })
  return result
}
