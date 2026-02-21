import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { bigint2string } from '~s/utils/bigint'
import { stringToBigInt } from '~s/utils/codecs'
import { Clip } from '~s/utils/common/capture'

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
