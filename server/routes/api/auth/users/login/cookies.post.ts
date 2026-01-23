import { defineHandler, HTTPError } from 'nitro/h3'
import {
  AuthUserLogin,
  type TaskAuthUserLoginPayload,
} from '~/server/tasks/auth/user/login'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async ({ req }) => {
  const payload = (await req.json()) as TaskAuthUserLoginPayload
  if (!payload.bauth_cookies) {
    throw new HTTPError('Missing bauth_cookies', { statusCode: 400 })
  }
  const res = await AuthUserLogin(payload).catch((err: Error) => {
    throw new HTTPError(`Failed to login user with provided cookies`, {
      statusCode: 500,
      cause: err,
    })
  })
  return bigint2string(res)
})
