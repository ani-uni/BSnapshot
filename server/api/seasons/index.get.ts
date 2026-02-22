import { defineHandler } from 'nitro/h3'
import { Season } from '~s/utils/common/season'

export default defineHandler(async () => {
  const seasons = await Season.list()
  return seasons
})
