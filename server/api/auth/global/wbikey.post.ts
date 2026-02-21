import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { AuthGlobalWbiKeyRefresh } from '~s/tasks/auth/global/wbikey/refresh'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z
      .object({
        bauth_cookies: z.string().optional(),
      })
      .optional(),
  )
  const res = await AuthGlobalWbiKeyRefresh(payload)
  return res
})
