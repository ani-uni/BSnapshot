import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string } from '~s/utils/bigint'
import { Cookies } from '~s/utils/cookies'

import type { UserModel } from '~/generated/prisma/models'

import { AuthUserLogin } from './login'

export interface TaskAuthUserLoginQrPayload {
  qrcode_key?: string
}

export type TaskAuthUserLoginQrResult =
  | { url: string; qrcode_key: string }
  | UserModel

export default defineTask<TaskResult<TaskAuthUserLoginQrResult>>({
  meta: {
    name: 'auth:user:login_qr',
    description: 'Login user with QR code',
  },
  async run({ payload }: { payload: TaskAuthUserLoginQrPayload }) {
    if (!payload) {
      const result = await AuthUserLoginQr()
      return bigint2string({ result })
    } else {
      const result = await AuthUserLoginQr(
        payload as TaskAuthUserLoginQrPayload,
      )
      return bigint2string({ result })
    }
  },
})

export function AuthUserLoginQr(): Promise<{ url: string; qrcode_key: string }>
export function AuthUserLoginQr(
  payload: TaskAuthUserLoginQrPayload,
): Promise<UserModel>
export async function AuthUserLoginQr(
  payload?: TaskAuthUserLoginQrPayload,
): Promise<TaskAuthUserLoginQrResult> {
  const headers = new Cookies().toHeaders('bili_web')
  // 如果没有提供 qrcode_key，先获取二维码
  if (!payload?.qrcode_key) {
    return ky
      .get(
        'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
        {
          headers,
        },
      )
      .json<{
        code: number
        message: string
        data: { url: string; qrcode_key: string }
      }>()
      .then((res) => {
        if (res.code !== 0)
          throw new HTTPError(`获取二维码失败: ${res.message}`, {
            status: 500,
          })
        return res.data
      })
  } else {
    return ky
      .get(
        `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${payload.qrcode_key}`,
        {
          headers,
        },
      )
      .then(async (res) => {
        const body = await res.json<{
          code: number
          message: string
          data: { code: number; message: string; url?: string }
        }>()
        const cookies = Cookies.parseHeaders(res.headers)
        return { body, cookies }
      })
      .then((res) => {
        if (res.body.code !== 0)
          throw new HTTPError(
            `尝试检测是否完成扫码登录失败: ${res.body.message}`,
            {
              status: 500,
            },
          )
        return res
      })
      .then(async (res) => {
        const { code: statusCode, message } = res.body.data
        switch (statusCode) {
          case 86101:
            throw new HTTPError('未扫码', { status: 400 })
          case 86090:
            throw new HTTPError('已扫码未确认', { status: 400 })
          case 0: {
            if (res.cookies.hasCookies)
              return AuthUserLogin({ bauth_cookies: res.cookies.toString() })
            else
              throw new HTTPError('登录失败: 未获取到Cookies', {
                status: 500,
              })
          }
          case 86038:
            throw new HTTPError('二维码已失效', { status: 500 })
          default:
            throw new HTTPError(`未知状态: ${message}`, { status: 500 })
        }
      })
  }
}
