import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: z.string(),
    }),
  )
  const capture = await Capture.loadFromCID(BigInt(params.cid))
  return capture.toJSON
})
