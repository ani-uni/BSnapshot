import { defineHandler } from 'nitro/h3'
import { TMDB } from '~s/utils/3rd-ref/tmdb'

export default defineHandler(async () => {
  const tmdb = await TMDB.init()
  return tmdb.toJSON()
})
