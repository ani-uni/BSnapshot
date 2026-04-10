import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { migrateDB } from '~s/utils/db-migrate'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.object({
      s: z.union([z.string(), z.number()]).optional(),
      e: z.union([z.string(), z.number()]).optional(),
    }),
  )
  migrateDB(payload.s, payload.e)
  return { success: true }
})
