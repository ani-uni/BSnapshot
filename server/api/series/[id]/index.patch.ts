import {
  defineHandler,
  getValidatedRouterParams,
  readValidatedBody,
} from 'nitro/h3'
import z from 'zod'
import { Series, seriesRefSchema } from '~s/utils/common/series'

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
      ref: seriesRefSchema.optional(),
      title: z.string().optional(),
      seasons: z.array(z.cuid2()).optional(),
    }),
  )
  const series = await Series.loadFromID(params.id)
  if (body.title) await series.editTitle(body.title)
  if (body.ref) await series.editRef(body.ref)
  if (body.seasons) await series.setSeasons(body.seasons)
  return series.toJSON()
})
