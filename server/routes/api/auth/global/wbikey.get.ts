import { defineHandler, HTTPError } from 'nitro/h3'
import { AuthGlobalWbiKeyGet } from '~/server/tasks/auth/global/wbikey/get'

export default defineHandler(async () => {
  const res = await AuthGlobalWbiKeyGet().catch((err: Error) => {
    throw new HTTPError('Failed to get WBI keys', {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
