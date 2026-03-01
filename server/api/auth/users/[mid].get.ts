import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { AuthUserGet } from '~s/tasks/auth/user/get'
import { stringToBigInt } from '~s/utils/codecs'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      mid: stringToBigInt,
    }),
  )
  const res = await AuthUserGet({ mid: params.mid })
  return res.toJSON()
})
