import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { BgmTv } from '~s/utils/3rd-ref/bgmtv'

export default defineCachedHandler(
  async (event) => {
    const query = await getValidatedQuery(
      event,
      z.object({
        query: z.string(),
      }),
    )
    const bgmtv = new BgmTv()
    const id_check = z.coerce.number().int().positive().safeParse(query.query)
    if (id_check.success) {
      const subject = await bgmtv
        .getSubjectInfo(id_check.data)
        .catch(() => null)
      if (subject !== null) return subject
    }
    return bgmtv.searchSubjects(query.query)
  },
  { maxAge: 60 * 60 },
)
