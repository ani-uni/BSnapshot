import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { TaskPreGen } from '~s/tasks/task/pregen'
import { bigint2string } from '~s/utils/bigint'
import { stringToBigInt } from '~s/utils/codecs'

export default defineHandler(async (event) => {
  const payload = await getValidatedRouterParams(
    event,
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('aid'),
        id: stringToBigInt,
      }),
      z.object({
        type: z.literal('bvid'),
        id: z.string(),
      }),
      z.object({
        type: z.literal('cid'),
        id: stringToBigInt,
      }),
    ]),
  )
  const body = await readValidatedBody(
    event,
    z.object({ fastcap_manual: z.string().optional() }).optional(),
  )
  const res = await TaskPreGen(payload, body?.fastcap_manual)
  return bigint2string(res)
})
