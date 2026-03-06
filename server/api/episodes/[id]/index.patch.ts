import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { Episode, epRefSchema } from '~s/utils/common/episode'

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
      ref: epRefSchema.optional(),
      title: z.string().optional(),
      clips: z.array(z.cuid2()).optional(),
      season: z
        .xor([
          z.object({ id: z.cuid2(), sn: z.int() }),
          z.object({ id: z.null(), sn: z.undefined().optional() }),
        ])
        .optional(),
    }),
  )
  const episode = await Episode.loadFromID(params.id)
  if (body.title) await episode.editTitle(body.title)
  if (body.ref) await episode.editRef(body.ref)
  if (body.clips) await episode.setClips(body.clips)
  if (body.season) await episode.setSeason(body.season.id, body.season.sn)
  return episode.toJSON()
})
