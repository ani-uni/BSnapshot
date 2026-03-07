import z from 'zod'

export const ClipSimpleSchema = z.tuple([
  z.number(),
  z.number(),
  z.boolean().optional(), // 分隔符，为true表示要与下一个片段合并(若为交集)
])
export type ClipSimple = z.infer<typeof ClipSimpleSchema>

export const ClipsSchema = z.array(ClipSimpleSchema)
export type Clips = z.infer<typeof ClipsSchema>
