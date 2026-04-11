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
  const payload = await readValidatedBody(
    event,
    z.object({
      ref: epRefSchema.optional(),
      title: z.string().optional(),
      clips: z.array(z.cuid2()).optional(),
      season: z
        .xor([
          z.object({ id: z.cuid2(), sn: z.number() }),
          z.object({ id: z.null(), sn: z.undefined().optional() }),
        ])
        .optional(),
    }),
  )
  const episode = await Episode.loadFromID(params.id)
  if (payload.title) await episode.editTitle(payload.title)
  if (payload.ref) await episode.editRef(payload.ref)
  if (payload.clips) await episode.setClips(payload.clips)
  if (payload.season) await episode.setSeason(payload.season.id, payload.season.sn)
  return episode.toJSON()
})
