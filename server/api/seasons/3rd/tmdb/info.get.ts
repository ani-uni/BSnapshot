import { defineCachedHandler } from 'nitro/cache'
import { getValidatedQuery, HTTPError } from 'nitro/h3'
import z from 'zod'
import { parseTMDBUrlC, TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineCachedHandler(
  async (event) => {
    const query = await getValidatedQuery(
      event,
      z.object({
        urlc: z.string(),
      }),
    )
    const tmdb = await TMDB.init()
    const parsed = parseTMDBUrlC(query.urlc)
    if (parsed?.season_number !== undefined) return tmdb.getTVSeriesInfo(parsed)
    else if (parsed?.movie_id !== undefined) return tmdb.getMovieInfo(parsed)
    throw new HTTPError('不合法的 TMDB UrlC!', { status: 400 })
  },
  { maxAge: 60 * 60 },
)
