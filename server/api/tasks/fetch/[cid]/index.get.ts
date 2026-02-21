import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { stringToBigInt } from '~s/utils/codecs'
import { FetchTask } from '~s/utils/common/fetchtask'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: stringToBigInt,
    }),
  )
  const ft = (await FetchTask.listFromCID(params.cid)).map((t) => t.toJSON)
  return ft
})
