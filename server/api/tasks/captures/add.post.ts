import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { ClipsSchema } from '~s/types/task'
import { stringToBigInt } from '~s/utils/codecs'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.object({
      clips: ClipsSchema,
      cid: stringToBigInt,
      aid: stringToBigInt.optional(),
      pubdate: z.number().optional(),
      upMid: stringToBigInt.optional(),
    }),
  )
  const data = await Capture.create({
    clips: payload.clips,
    cid: payload.cid,
    aid: payload.aid,
    pubdate: payload.pubdate,
    upMid: payload.upMid,
  })
  return data.toJSON()
})
