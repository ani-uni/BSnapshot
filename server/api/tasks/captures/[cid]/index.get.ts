import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~/server/utils/codecs'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  const capture = await Capture.loadFromCID(params.cid)
  return capture.toJSON
})
