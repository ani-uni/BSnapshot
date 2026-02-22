import { defineHandler } from 'nitro/h3'
import { Series } from '~s/utils/common/series'

export default defineHandler(async () => {
  const series = await Series.list()
  return series
})
