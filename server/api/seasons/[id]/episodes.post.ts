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
      id: z.union([z.cuid2()]),
    }),
  )
  const body = await readValidatedBody(
    event,
    z.object({ sn: z.int().positive() }),
  )
  const episode = await Episode.create(params.id, body.sn)
  return episode
})
