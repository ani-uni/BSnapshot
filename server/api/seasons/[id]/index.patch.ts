import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { Season, ssRefSchema } from '~s/utils/common/season'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.cuid2(),
    }),
  )
  const payload = await readValidatedBody(
    event,
    z.object({
      ref: ssRefSchema.optional(),
      title: z.string().optional(),
      episodes: z.array(z.cuid2()).optional(),
    }),
  )
  const season = await Season.loadFromID(params.id)
  if (payload.title) await season.editTitle(payload.title)
  if (payload.ref) await season.editRef(payload.ref)
  if (payload.episodes) await season.setEpisodes(payload.episodes)
  return season.toJSON()
})
