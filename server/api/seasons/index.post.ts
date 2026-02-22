import { defineHandler } from 'nitro/h3'
import { Season } from '~s/utils/common/season'

export default defineHandler(async () => {
  const season = await Season.create()
  return season.toJSON
})
