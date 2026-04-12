import { defineCachedHandler } from 'nitro/cache'
import { getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Episode } from '~s/utils/common/episode'
import { FastCap } from '~s/utils/common/fastcap'

export default defineCachedHandler(
  async (event) => {
    const params = await getValidatedRouterParams(
      event,
      z.object({
        id: z.cuid2(),
      }),
    )
    const episode = await Episode.loadFromID(params.id)
    const fastcap = await FastCap.fromEpisode(episode)
    return fastcap.stringify()
  },
  { maxAge: 60 * 60 },
)
