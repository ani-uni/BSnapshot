import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { TaskPayload } from '~/server/types/tasks/payload'
import { JSONBigInt } from '~/server/utils/bigint'
import { Cookies } from '~/server/utils/cookies'
import { prisma } from '~/server/utils/prisma'
import { AuthUserRefresh } from './refresh'

export interface TaskAuthUserLoginPayload {
  bauth_cookies: string
}

export type TaskAuthUserLoginResult = Omit<UserModel, 'mid'> & { mid: string }

export default defineTask<TaskAuthUserLoginResult>({
  meta: {
    name: 'auth:user:login',
    description: 'Login user',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserLoginPayload> }) {
    if (!payload.bauth_cookies)
      throw new HTTPError('Missing bauth_cookies', { statusCode: 400 })
    const result = await AuthUserLogin(payload as TaskAuthUserLoginPayload)
    return { result }
  },
})

export async function AuthUserLogin(
  payload: TaskAuthUserLoginPayload,
): Promise<TaskAuthUserLoginResult> {
  const cookies = new Cookies(payload.bauth_cookies)
  const res = await ky
    .get('https://api.bilibili.com/x/web-interface/nav', {
      headers: cookies.toHeaders(),
      parseJson: JSONBigInt.parse,
    })
    .json<{
      code: 0
      message: '0'
      ttl: 1
      data: { uname: string; mid: bigint; vip: { type: number } }
    }>()
    .then(async (res) => {
      if (res.code !== 0)
        throw new HTTPError(`获取个人信息失败: ${res.message}`, {
          statusCode: 500,
        })
      const { uname, mid, vip } = res.data
      if (!mid || !uname || !vip)
        throw new HTTPError('获取个人信息失败: 无法获取mid/uname/vip', {
          statusCode: 500,
        })
      await prisma.user.upsert({
        where: { mid },
        update: {
          uname,
          vip: !!vip.type,
          bauth_cookies: cookies.toString(),
        },
        create: {
          mid,
          uname,
          vip: !!vip.type,
          bauth_cookies: cookies.toString(),
        },
      })
      const newUser = await AuthUserRefresh({ mid: mid.toString() })
      return newUser
    })
  const result = { ...res, mid: res.mid.toString() }
  return result
}
