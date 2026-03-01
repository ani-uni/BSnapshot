import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Series } from '~s/utils/common/series'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.union([z.cuid2(), z.literal('default')]),
    }),
  )
  if (params.id === 'default')
    return {
      id: 'default',
      title: '无所属季度',
      tmdb: null,
    }
  const series = await Series.loadFromID(params.id)
  return series.toJSON()
})
