import { defineEventHandler, HTTPError } from 'nitro/h3'
import { ConfigGet } from '~/server/tasks/config/get'
import { bigint2string } from '~/server/utils/bigint'

export default defineEventHandler(async () => {
  const data = await ConfigGet().catch((err: Error) => {
    throw new HTTPError('Failed to get config', { statusCode: 500, cause: err })
  })
  return bigint2string(data)
})
