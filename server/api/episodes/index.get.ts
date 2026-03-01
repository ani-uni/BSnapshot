import { defineHandler, getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { Episode } from '~s/utils/common/episode'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({ def: z.stringbool().optional() }),
  )
  const episodes = await Episode.list(query.def)
  return episodes
})
