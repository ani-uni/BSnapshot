import { defineHandler } from 'nitro/h3'
import { Episode } from '~s/utils/common/episode'

export default defineHandler(async () => {
  const episode = await Episode.create()
  return episode.toJSON
})
