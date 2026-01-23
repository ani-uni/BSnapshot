import { defineEventHandler, HTTPError } from 'nitro/h3'
import { ConfigSet, type TaskConfigSetPayload } from '~/server/tasks/config/set'

export default defineEventHandler(async ({ req }) => {
  const payload = (await req.json()) as TaskConfigSetPayload
  const data = await ConfigSet(payload ?? {}).catch((err: Error) => {
    throw new HTTPError('Failed to update config', { statusCode: 500, cause: err })
  })
  return { success: true, data }
})
