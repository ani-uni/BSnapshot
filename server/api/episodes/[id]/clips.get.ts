import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { bigint2string } from '~s/utils/bigint'
import { Clip } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const clips = await Clip.listInfoFromEpisodeID(params.id)
  return bigint2string(clips)
})
