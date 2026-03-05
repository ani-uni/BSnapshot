import { defineHandler, getValidatedQuery, HTTPError } from 'nitro/h3'
import z from 'zod'
import { parseTMDBUrlC, TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({
      query: z.string(),
    }),
  )
  const tmdb = await TMDB.init()
  const p = parseTMDBUrlC(query.query)
  if (p === null) return tmdb.searchTV(query.query)
  else if (p.season_number) return tmdb.getTVSeasonInfo(p)
  else if (p.movie_id) return tmdb.getMovieInfo(p)
  else
    throw new HTTPError('不合法的 TMDB UrlC (你输入的类型是电影)!', {
      status: 400,
    })
})
