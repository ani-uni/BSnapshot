import { DM_format } from '@dan-uni/dan-any'
import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import z from 'zod'
import { Clip } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const params = await getValidatedRouterParams(
    event,
    z.object({
      id: z.string(),
      fmt: z.enum(DM_format),
    }),
  )
  const clip = await Clip.loadFromID(params.id)
  const pool = await clip.getDanmaku(true)
  return pool?.convert2(params.fmt) || null
})
