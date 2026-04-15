import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { TaskPreGen, TaskTaskPreGenPayloadSchema } from '~s/tasks/task/pregen'
import { bigint2string } from '~s/utils/bigint'

export default defineHandler(async (event) => {
  const payload = await getValidatedRouterParams(
    event,
    TaskTaskPreGenPayloadSchema,
  )
  const body = await readValidatedBody(
    event,
    z.object({ fastcap_manual: z.string().optional() }).optional(),
  )
  const res = await TaskPreGen(payload, body?.fastcap_manual)
  return bigint2string(res)
})
