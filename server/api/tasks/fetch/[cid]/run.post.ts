import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~s/utils/codecs'
import { Capture } from '~s/utils/common/capture'

import { TaskTypeSchema } from '~/generated/zod/schemas'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  const payload = await readValidatedBody(
    event,
    z.object({
      types: z.array(TaskTypeSchema).optional(),
      manual: z.boolean().optional(),
    }),
  )
  const capture = await Capture.loadFromCID(params.cid)
  await capture.run(payload.types, payload.manual)
  return { success: true }
})
