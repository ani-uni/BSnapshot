import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { TaskPreGen } from '~/server/tasks/task/pregen'
import { bigint2string } from '~/server/utils/bigint'
import { stringToBigInt } from '~/server/utils/codecs'

export default defineHandler(async (event) => {
  const payload = await getValidatedRouterParams(
    event,
    z.xor([
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
  const res = await TaskPreGen(payload)
  return bigint2string(res)
})
