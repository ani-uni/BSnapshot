import { convert2Formats } from '@dan-uni/dan-any'
import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~s/utils/codecs'
import { Capture } from '~s/utils/common/capture'

export default defineCachedHandler(
  async (event) => {
    const params = await getValidatedRouterParams(
      event,
      z.object({
        cid: stringToBigInt,
        fmt: z.union([z.enum(convert2Formats), z.literal('stats')]),
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
    return pool.convert2(params.fmt, true)
  },
  { maxAge: 10 },
)
