import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { TaskTypeSchema } from '~/generated/zod/schemas'
import { stringToBigInt } from '~s/utils/codecs'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.object({
      clips: z.array(z.tuple([z.number(), z.number()])),
      cid: stringToBigInt,
      pubdate: z.number().optional(),
      upMid: stringToBigInt.optional(),
      taskTypes: z.array(TaskTypeSchema).min(0).max(4).optional(),
    }),
  )
  const data = await Capture.create({
    clips: payload.clips,
    cid: payload.cid,
    pubdate: payload.pubdate,
    upMid: payload.upMid,
    // taskTypes: payload.taskTypes,
  })
  return data.toJSON
})
