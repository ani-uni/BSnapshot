import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Episode } from '~s/utils/common/episode'

// 用于加载该系列拥有的子剧集列表
export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.union([z.cuid2(), z.literal('default')]),
    }),
  )
  const episodes = await (params.id === 'default'
    ? Episode.list(true)
    : Episode.listFromSeasonID(params.id))
  return episodes
})
