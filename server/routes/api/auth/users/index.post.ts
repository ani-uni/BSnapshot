import { defineHandler, HTTPError } from 'nitro/h3'
import { AuthUserCheck } from '~/server/tasks/auth/user/check'

export default defineHandler(async () => {
  const res = await AuthUserCheck().catch((err: Error) => {
    throw new HTTPError('Failed to check users', {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
