import { defineHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import z from 'zod'
import { parseTMDBUrlC, TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({
      urlc: z.string(),
    }),
  )
  const tmdb = await TMDB.init()
  const parsed = parseTMDBUrlC(query.urlc)
  if (parsed?.season_number) return tmdb.getTVSeriesInfo(parsed)
  else if (parsed?.movie_id) return tmdb.getMovieInfo(parsed)
  throw new HTTPError('不合法的 TMDB UrlC!', { status: 400 })
})
