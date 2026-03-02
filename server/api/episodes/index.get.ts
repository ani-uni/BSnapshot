import { defineHandler } from 'nitro/h3'
import { Episode } from '~s/utils/common/episode'

// 用于获取全部的剧集，包含 有/无 所属季度状态
export default defineHandler(async () => {
  const episodes = await Episode.list(false)
  return episodes
})
