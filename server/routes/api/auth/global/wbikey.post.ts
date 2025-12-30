import { defineHandler, HTTPError } from 'nitro/h3'
import {
  AuthGlobalWbiKeyRefresh,
  type TaskAuthGlobalWbikeyRefreshPayload,
} from '~/server/tasks/auth/global/wbikey/refresh'

export default defineHandler(async ({ req }) => {
  let payload: TaskAuthGlobalWbikeyRefreshPayload = {}
  if (req.body) payload = await req.json()
  if (!payload.bauth_cookies) payload = {}
  const res = await AuthGlobalWbiKeyRefresh(payload).catch((err) => {
    throw new HTTPError('Failed to refresh WBI keys', {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
