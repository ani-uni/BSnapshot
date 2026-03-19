import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const captures = await Capture.listInfoFromSeasonID(params.id)
  return captures
})
