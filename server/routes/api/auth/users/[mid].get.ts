import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { AuthUserGet } from '~/server/tasks/auth/user/get'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      mid: z.string(),
    }),
  )
  const res = await AuthUserGet({ mid: BigInt(params.mid) })
  return res.toJSON
})
