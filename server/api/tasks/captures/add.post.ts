import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { TaskTypeSchema } from '~/generated/zod/schemas'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.object({
      clips: z.array(z.tuple([z.number(), z.number()])),
      cid: z.string(),
      pubdate: z.number().optional(),
      upMid: z.string().optional(),
      taskTypes: z.array(TaskTypeSchema).min(0).max(4).optional(),
    }),
  )
  const data = await Capture.create({
    clips: payload.clips,
    cid: BigInt(payload.cid),
    pubdate: payload.pubdate,
    upMid: payload.upMid ? BigInt(payload.upMid) : undefined,
    // taskTypes: payload.taskTypes,
  })
  return data.toJSON
})
