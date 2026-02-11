import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { FetchTask } from '~/server/utils/common/fetchtask'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      cid: z.string(),
    }),
  )
  const ft = (await FetchTask.listFromCID(BigInt(params.cid))).map(
    (t) => t.toJSON,
  )
  return ft
})
