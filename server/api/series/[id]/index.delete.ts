import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Series } from '~s/utils/common/series'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const series = await Series.loadFromID(params.id)
  await series.del()
  return { success: true }
})
