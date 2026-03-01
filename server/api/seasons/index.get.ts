import { defineHandler, getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { Season } from '~s/utils/common/season'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({ def: z.stringbool().optional() }),
  )
  const seasons = await Season.list(query.def)
  return seasons
})
