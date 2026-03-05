import { defineHandler, getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { BgmTv } from '~s/utils/3rd-ref/bgmtv'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({
      episode_id: z.coerce.number().int().positive(),
    }),
  )
  const bgmtv = new BgmTv()
  return bgmtv.getEpisodeInfo(query.episode_id)
})
