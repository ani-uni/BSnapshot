import z from 'zod'

export const ClipSimpleSchema = z.tuple([
  z.number(), // bili 片段开始
  z.number(), // bili 片段结束
  z.number(), // 该片段在该剧集中的实际开始时间(即偏移值)
  z.cuid2(), // 该片段所属剧集id(此处填入自动合并至episode表)
])

export const ClipsSchema = z.array(ClipSimpleSchema)
export type Clips = z.infer<typeof ClipsSchema>
