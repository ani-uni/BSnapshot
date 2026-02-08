import { defineHandler, readValidatedBody } from 'nitro/h3'
import { ConfigModelSchema } from '~/generated/zod/schemas'
import { ConfigSet } from '~/server/tasks/config/set'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    ConfigModelSchema.omit({ id: true }),
  )
  const data = await ConfigSet(payload)
  return data
})
