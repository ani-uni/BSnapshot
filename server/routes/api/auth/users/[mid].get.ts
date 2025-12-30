import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { AuthUserGet } from '~/server/tasks/auth/user/get'

export default defineHandler(async (event) => {
  const mid = getRouterParam(event, 'mid')
  if (!mid) {
    throw new HTTPError('Missing mid', { statusCode: 400 })
  }
  const res = await AuthUserGet({ mid: mid }).catch((err: Error) => {
    throw new HTTPError(`Failed to get user with mid ${mid}`, {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
