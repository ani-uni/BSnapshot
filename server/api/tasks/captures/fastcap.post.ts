import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { ClipsSchema } from '~s/types/task'
import { stringToBigInt } from '~s/utils/codecs'
import { FastCap } from '~s/utils/common/fastcap'

export default defineHandler(async (event) => {
  const body = await readValidatedBody(
    event,
    z.array(
      z.object({
        clips: ClipsSchema,
        cid: stringToBigInt,
        aid: stringToBigInt.optional(),
        pubdate: z.int().nonnegative().optional(),
        upMid: stringToBigInt.optional(),
      }),
    ),
  )
  const fastcap = await FastCap.fromCaptureCreate(body)
  return fastcap.stringify()
})
