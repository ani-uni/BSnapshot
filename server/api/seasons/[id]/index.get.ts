import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Season } from '~s/utils/common/season'

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
      sn: -1,
      title: '无所属剧集',
      bgmtv: null,
      tmdb: null,
      seriesId: 'default',
    }
  const season = await Season.loadFromID(params.id)
  return season.toJSON()
})
