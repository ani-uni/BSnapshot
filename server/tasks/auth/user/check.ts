import { defineTask } from 'nitro/task'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string } from '~s/utils/bigint'
import { Event } from '~s/utils/common/event'
import { checkNetworkConnectivity } from '~s/utils/connectivity'
import { prisma } from '~s/utils/prisma'
import { AuthUserLogin } from './login'

export interface TaskAuthUserCheckResult {
  deletedUserMids: bigint[]
}

export default defineTask<TaskResult<TaskAuthUserCheckResult>>({
  meta: {
    name: 'auth:user:check',
    description: 'Check all users',
  },
  async run() {
    const result = await AuthUserCheck()
    return bigint2string({ result })
  },
})

export async function AuthUserCheck(): Promise<TaskAuthUserCheckResult> {
  const e = new Event('auth:user:check')
  const net = await checkNetworkConnectivity()
  if (!net) {
    e.warn('网络未连接，跳过用户登录状态检查')
    return { deletedUserMids: [] }
  }
  const users = await prisma.user.findMany({
    select: { mid: true, bauth_cookies: true },
  })
  const toDelMids: bigint[] = []
  for (const u of users) {
    if (u.bauth_cookies === null) {
      toDelMids.push(u.mid)
    } else {
      await AuthUserLogin({ bauth_cookies: u.bauth_cookies }).catch(
        (err: Error) => {
          e.err('登录状态异常', err)
          toDelMids.push(u.mid)
        },
      )
    }
  }
  if (toDelMids.length === 0) return { deletedUserMids: [] }
  await prisma.user.deleteMany({
    where: { mid: { in: toDelMids } },
  })
  e.warn(
    '登录状态刷新',
    `${toDelMids.length} 个用户登录失效：${toDelMids.join(', ')}`,
  )
  return { deletedUserMids: toDelMids }
}
