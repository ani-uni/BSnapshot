import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~s/utils/codecs'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  await Capture.del(params.cid)
  return { success: true }
})
