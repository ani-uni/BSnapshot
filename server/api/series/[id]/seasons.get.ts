import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Season } from '~s/utils/common/season'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const seasons = await Season.listFromSeriesID(params.id)
  return seasons
})
