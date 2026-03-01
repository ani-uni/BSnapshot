import { defineHandler, readValidatedBody } from 'nitro/h3'
import { TMDB, TMDBConfigSchema } from '~s/utils/3rd-ref/tmdb'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(event, TMDBConfigSchema)
  const data = await TMDB.setConfig(payload)
  return data.toJSON()
})
