import { defineHandler } from 'nitro'
import { getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~s/utils/codecs'
import { VideoSource } from '~s/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      aid: stringToBigInt,
    }),
  )
  const videoSource = await VideoSource.loadFromAid(params.aid)
  return videoSource.toJSON()
})
