import { defineTask } from 'nitro/task'
import { prisma } from '~/server/utils/prisma'
import { AuthUserLogin } from './login'

export interface TaskAuthUserCheckResult {
  deletedUserMids: bigint[]
}

export default defineTask<TaskAuthUserCheckResult>({
  meta: {
    name: 'auth:user:check',
    description: 'Check all users',
  },
  async run() {
    const result = await AuthUserCheck()
    return { result }
  },
})

export async function AuthUserCheck(): Promise<TaskAuthUserCheckResult> {
  const users = await prisma.user.findMany({
    select: { mid: true, bauth_cookies: true },
  })
  const toDelMids: bigint[] = []
  for (const u of users) {
    if (u.bauth_cookies === null) {
      toDelMids.push(u.mid)
    } else {
      await AuthUserLogin({ bauth_cookies: u.bauth_cookies }).catch(() => {
        toDelMids.push(u.mid)
      })
    }
  }
  if (toDelMids.length === 0) return { deletedUserMids: [] }
  await prisma.user.deleteMany({
    where: { mid: { in: toDelMids } },
  })
  return { deletedUserMids: toDelMids }
}
