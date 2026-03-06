import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery, HTTPError } from 'nitro/h3'
import z from 'zod'
import { parseTMDBUrlC, TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineCachedHandler(
  async (event) => {
    const query = await getValidatedQuery(
      event,
      z.object({
        query: z.string(),
      }),
    )
    const tmdb = await TMDB.init()
    const p = parseTMDBUrlC(query.query)
    if (p === null) return tmdb.searchTV(query.query)
    else if (p.episode_number) return tmdb.getTVEpisodeInfo(p)
    else
      throw new HTTPError('不合法的 TMDB UrlC (你输入的类型必须是剧集)!', {
        status: 400,
      })
  },
  { maxAge: 60 * 60 },
)
