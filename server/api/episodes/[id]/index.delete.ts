import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Episode } from '~s/utils/common/episode'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const episode = await Episode.loadFromID(params.id)
  await episode.del()
  return { success: true }
})
