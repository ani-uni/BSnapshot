import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~s/types/tasks/payload'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string, JSONBigInt } from '~s/utils/bigint'
import { Cookies } from '~s/utils/cookies'
import { prisma } from '~s/utils/prisma'

import type { UserModel } from '~/generated/prisma/models'

import { AuthUserRefresh } from './refresh'

export interface TaskAuthUserLoginPayload {
  bauth_cookies: string
}

export type TaskAuthUserLoginResult = UserModel

export default defineTask<TaskResult<TaskAuthUserLoginResult>>({
  meta: {
    name: 'auth:user:login',
    description: 'Login user',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserLoginPayload> }) {
    if (!payload.bauth_cookies)
      throw new HTTPError('Missing bauth_cookies', { status: 400 })
    const result = await AuthUserLogin(payload as TaskAuthUserLoginPayload)
    return bigint2string({ result })
  },
})

export async function AuthUserLogin(
  payload: TaskAuthUserLoginPayload,
): Promise<TaskAuthUserLoginResult> {
  const cookies = new Cookies(payload.bauth_cookies)
  const res = await ky
    .get('https://api.bilibili.com/x/web-interface/nav', {
      headers: cookies.toHeaders('bili_web'),
      parseJson: JSONBigInt.parse,
    })
    .json<{
      code: 0
      message: '0'
      ttl: 1
      data: { uname: string; mid: bigint; vip: { type: number } }
    }>()
    .then(async (r) => {
      if (r.code !== 0)
        throw new HTTPError(`获取个人信息失败: ${r.message}`, {
          status: 500,
        })
      const { uname, vip } = r.data
      const mid = BigInt(r.data.mid)
      if (!mid || !uname || !vip)
        throw new HTTPError('获取个人信息失败: 无法获取mid/uname/vip', {
          status: 500,
        })
      const bauth_cookies = cookies.toString()
      if (!bauth_cookies)
        throw new HTTPError('Invalid bauth_cookies', { status: 500 })
      await prisma.user.upsert({
        where: { mid },
        update: {
          uname,
          vip: !!vip.type,
          bauth_cookies,
        },
        create: {
          mid,
          uname,
          vip: !!vip.type,
          bauth_cookies,
        },
      })
      const newUser = await AuthUserRefresh({ mid })
      return newUser
    })
  return res
}
