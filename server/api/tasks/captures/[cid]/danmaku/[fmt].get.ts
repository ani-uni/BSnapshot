import { DM_format } from '@dan-uni/dan-any'
import {
  defineHandler,
  getValidatedQuery,
  getValidatedRouterParams,
} from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~/server/utils/codecs'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
      fmt: z.union([z.enum(DM_format), z.literal('stats')]),
    }),
  )
  const query = await getValidatedQuery(
    event,
    z.object({
      up: z.stringbool().optional(),
    }),
  )
  const capture = await Capture.loadFromCID(params.cid)
  const pool = await capture.getDanmaku(query.up)
  if (params.fmt === 'stats')
    return {
      count: pool.dans.length ?? 0,
    }
  return pool.convert2(params.fmt)
})
