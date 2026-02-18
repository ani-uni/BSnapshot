import TOML from 'smol-toml'
import z from 'zod'
import { DanmakuSearchOptionsSchema } from '../danmaku/up'
import { VideoInfoOptSchema } from '../video/info'

export const QueueIDParamsSchema = z.xor([
  z.object({
    type: z.literal('rt_seg'),
    oid: z.bigint(),
    seg: z.number(),
  }),
  z.object({
    type: z.literal('command_seg'),
    oid: z.bigint(),
  }),
  z.object({
    type: z.literal('his_index'),
    oid: z.bigint(),
    month: z.string(),
  }),
  z.object({
    type: z.literal('his_seg'),
    oid: z.bigint(),
    date: z.string(),
  }),
  z.object({
    type: z.literal('up_seg'),
    oid: z.bigint(),
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
