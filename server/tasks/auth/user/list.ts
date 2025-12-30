import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import { prisma } from '~/server/utils/prisma'

export type TaskAuthUserListResult = (Omit<
  UserModel,
  'mid' | 'bauth_cookies'
> & {
  mid: string
})[]

export default defineTask<TaskAuthUserListResult>({
  meta: {
    name: 'auth:user:list',
    description: 'List all users',
  },
  async run() {
    const result = await AuthUserList()
    return { result }
  },
})

export async function AuthUserList(): Promise<TaskAuthUserListResult> {
  const result = (
    await prisma.user.findMany({ omit: { bauth_cookies: true } })
  ).map((u) => ({
    ...u,
    mid: u.mid.toString(),
  }))
  return result
}
