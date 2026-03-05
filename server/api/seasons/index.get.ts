import { defineHandler } from 'nitro/h3'
import { Season } from '~s/utils/common/season'

// 用于获取全部的季度，包含 有/无 所属系列状态
export default defineHandler(async () => {
  const seasons = await Season.list()
  return seasons
})
