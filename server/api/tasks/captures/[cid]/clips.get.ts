import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { bigint2string } from '~/server/utils/bigint'
import { stringToBigInt } from '~/server/utils/codecs'
import { Clip } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  const clips = await Clip.listInfoFromCID(params.cid)
  return bigint2string(clips)
})
