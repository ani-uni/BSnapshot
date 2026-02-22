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
  const season = await Season.loadFromID(params.id)
  await season.del()
  return { success: true }
})
