import { defineHandler } from 'nitro/h3'
import { Episode } from '~s/utils/common/episode'

export default defineHandler(async () => {
  const episodes = await Episode.list()
  return episodes
})
