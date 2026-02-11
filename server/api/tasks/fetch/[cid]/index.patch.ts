import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { TaskTypeSchema } from '~/generated/zod/schemas'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: z.string(),
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
  const capture = await Capture.loadFromCID(BigInt(params.cid))
  await capture.createOrToggleFetchTasks(payload?.types)
  return { success: true }
})
