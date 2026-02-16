import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { TaskTypeSchema } from '~/generated/zod/schemas'
import { stringToBigInt } from '~/server/utils/codecs'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  const payload = await readValidatedBody(
    event,
    z
      .object({
        types: z.array(TaskTypeSchema).optional(),
      })
      .optional(),
  )
  const capture = await Capture.loadFromCID(params.cid)
  await capture.createOrToggleFetchTasks(payload?.types)
  return { success: true }
})
