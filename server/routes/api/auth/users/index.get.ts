import { defineHandler, HTTPError } from 'nitro/h3'
import { AuthUserList } from '~/server/tasks/auth/user/list'

export default defineHandler(async () => {
  const res = await AuthUserList().catch((err: Error) => {
    throw new HTTPError('Failed to list users', {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
