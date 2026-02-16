import { DM_format } from '@dan-uni/dan-any'
import {
  defineHandler,
  getValidatedQuery,
  getValidatedRouterParams,
} from 'nitro/h3'
import z from 'zod'
import { Clip } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
      fmt: z.union([z.enum(DM_format), z.literal('stats')]),
    }),
  )
  const query = await getValidatedQuery(
    event,
    z.object({
      up: z.stringbool().optional(),
    }),
  )
  const clip = await Clip.loadFromID(params.id)
  if (params.fmt === DM_format.DanuniPbBin) return clip.getDanmakuRaw(query.up)
  const pool = await clip.getDanmaku(query.up)
  if (params.fmt === 'stats')
    return {
      count: pool?.dans.length ?? 0,
    }
  return pool?.convert2(params.fmt)
})
