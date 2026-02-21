import TOML from 'smol-toml'
import z from 'zod'
import { DanmakuSearchOptionsSchema } from '../bili/danmaku/up'
import { VideoInfoOptSchema } from '../bili/video/info'

export const QueueIDParamsSchema = z.xor([
  z.object({
    type: z.literal('rt_seg'),
    oid: z.coerce.bigint(),
    seg: z.number(),
  }),
  z.object({
    type: z.literal('command_seg'),
    oid: z.coerce.bigint(),
  }),
  z.object({
    type: z.literal('his_index'),
    oid: z.coerce.bigint(),
    month: z.string(),
  }),
  z.object({
    type: z.literal('his_seg'),
    oid: z.coerce.bigint(),
    date: z.string(),
  }),
  z.object({
    type: z.literal('up_seg'),
    oid: z.coerce.bigint(),
    options: DanmakuSearchOptionsSchema.optional(),
  }),
  z.object({
    type: z.literal('view'),
    opt: VideoInfoOptSchema,
  }),
])

export const queueID2params = z.codec(z.string(), QueueIDParamsSchema, {
  decode: (toml) => {
    const parsed = TOML.parse(toml)
    return QueueIDParamsSchema.parse(parsed)
  },
  encode: (params) => {
    return TOML.stringify(params)
  },
})
