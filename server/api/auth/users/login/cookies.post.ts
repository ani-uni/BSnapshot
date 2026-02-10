import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { AuthUserLogin } from '~/server/tasks/auth/user/login'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.object({
      bauth_cookies: z.string(),
    }),
  )
  const res = await AuthUserLogin(payload)
  return bigint2string(res)
})
