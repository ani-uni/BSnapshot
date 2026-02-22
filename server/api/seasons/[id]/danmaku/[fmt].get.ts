import { DM_format } from '@dan-uni/dan-any'
import {
  defineHandler,
  getValidatedQuery,
  getValidatedRouterParams,
} from 'nitro/h3'
import z from 'zod'
import { Season } from '~s/utils/common/season'

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
  const season = await Season.loadFromID(params.id)
  const pool = await season.getDanmaku(query.up)
  if (params.fmt === 'stats')
    return {
      count: pool.dans.length ?? 0,
    }
  if (params.fmt === DM_format.BiliXml)
    event.res.headers.set('Content-Type', 'application/xml')
  return pool.convert2(params.fmt)
})
