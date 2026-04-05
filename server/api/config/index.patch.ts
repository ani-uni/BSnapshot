import { defineHandler, readValidatedBody } from 'nitro/h3'
import { ConfigSet } from '~s/tasks/config/set'

import { ConfigModelSchema } from '~/generated/zod/schemas'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    ConfigModelSchema.omit({ id: true }),
  )
  const data = await ConfigSet(payload)
  return data
})
