import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineCachedHandler(
  async (event) => {
    const query = await getValidatedQuery(
      event,
      z.object({
        urlc: z.string(),
      }),
    )
    const tmdb = await TMDB.init()
    return tmdb.getTVEpisodeInfo(query.urlc)
  },
  { maxAge: 60 * 60 },
)
