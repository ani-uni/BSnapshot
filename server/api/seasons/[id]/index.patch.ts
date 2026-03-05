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
  const body = await readValidatedBody(
    event,
    z.object({
      ref: ssRefSchema.optional(),
      title: z.string().optional(),
      episodes: z.array(z.cuid2()).optional(),
    }),
  )
  const season = await Season.loadFromID(params.id)
  if (body.title) await season.editTitle(body.title)
  if (body.ref) await season.editRef(body.ref)
  if (body.episodes) await season.setEpisodes(body.episodes)
  return season.toJSON()
})
