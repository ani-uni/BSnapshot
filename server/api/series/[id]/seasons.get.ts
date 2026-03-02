import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Season } from '~s/utils/common/season'

// 用于加载该系列拥有的子季度列表
export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.union([z.cuid2(), z.literal('default')]),
    }),
  )
  const seasons =
    params.id === 'default'
      ? [{ id: 'default', title: '无所属剧集' }, ...(await Season.list(true))]
      : await Season.listFromSeriesID(params.id)
  return seasons
})
