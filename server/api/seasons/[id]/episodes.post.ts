import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { Episode } from '~s/utils/common/episode'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.union([z.cuid2(), z.literal('default')]),
    }),
  )
  if (params.id === 'default') return Episode.create(null)
  const payload = await readValidatedBody(event, z.object({ sn: z.int() }))
  const episode = await Episode.create(params.id, payload.sn)
  return episode
})
