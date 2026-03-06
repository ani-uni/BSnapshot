import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { BgmTv } from '~s/utils/3rd-ref/bgmtv'

export default defineCachedHandler(
  async (event) => {
    const query = await getValidatedQuery(
      event,
      z.object({
        subject_id: z.coerce.number().int().positive(),
      }),
    )
    const bgmtv = new BgmTv()
    return bgmtv.getSubjectInfo(query.subject_id)
  },
  { maxAge: 60 * 60 },
)
