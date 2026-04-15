import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import z from 'zod'
import type { TaskPayload } from '~s/types/tasks/payload'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string } from '~s/utils/bigint'
import { getVideoBasic, type VideoBasic } from '~s/utils/bili/video/main'
import { stringToBigInt } from '~s/utils/codecs'
import { User } from '~s/utils/common/user'

export const TaskTaskPreGenPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('auto'),
    id: z.string(),
  }),
  z.object({
    type: z.literal('cid'),
    id: stringToBigInt,
  }),
])
export type TaskTaskPreGenPayload = z.infer<typeof TaskTaskPreGenPayloadSchema>

export type TaskTaskPreGenResult = VideoBasic

export default defineTask<TaskResult<TaskTaskPreGenResult>>({
  meta: {
    name: 'task:pregen',
    description: 'Pre-generate clip resources',
  },
  async run({ payload }: { payload: TaskPayload<TaskTaskPreGenPayload> }) {
    if (
      !payload.type ||
      !payload.id ||
      (payload.type === 'cid' && typeof payload.id !== 'bigint') ||
      (payload.type === 'auto' && typeof payload.id !== 'string')
    )
      throw new HTTPError('Invalid payload', { status: 400 })
    const res = await TaskPreGen(payload as TaskTaskPreGenPayload)
    return { result: bigint2string(res) }
  },
})

function abParser(
  input: string,
): { type: 'aid'; id: bigint } | { type: 'bvid'; id: string } | null {
  if (z.coerce.bigint().safeParse(input).success)
    return { type: 'aid', id: BigInt(input) }
  else if (input.startsWith('BV') || input.startsWith('bv'))
    return { type: 'bvid', id: input }
  else if (input.startsWith('AV') || input.startsWith('av'))
    return { type: 'aid', id: BigInt(input.slice(2)) }
  return null
}

async function inputParser(input: string) {
  let ab = abParser(input)
  if (ab) return ab
  // 尝试暴力匹配BVID
  const bvMatch = input.match(/BV[0-9A-Za-z]{10}/)
  if (bvMatch) ab = abParser(bvMatch[0])
  if (ab) return ab
  // 接下来检测是否可识别为常见的链接形式
  try {
    let url = new URL(decodeURIComponent(input))
    // 若为b23.tv短链接，则需额外处理
    if (url.hostname === 'b23.tv') {
      const ps = url.pathname.split('/')
      if (ps[0]) ab = abParser(ps[0])
      if (ab) return ab
      // 否则为生成的短链接，需解析重定向到的链接
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'manual',
      })
      const location = res.headers.get('Location')
      if (location) url = new URL(location)
    }
    // 尝试匹配 /video/BV1PWcXzrExh 或 /video/av12345678 或 无/video 等形式
    const ps = url.pathname.split('/').filter(Boolean)
    if (ps[0] === 'video' && ps[1]) ab = abParser(ps[1])
    else if (ps[0]) ab = abParser(ps[0])
    if (ab) return ab
    // 尝试从查询参数中提取 aid/bvid
    const said = url.searchParams.get('aid') || url.searchParams.get('oid')
    if (said) ab = abParser(said)
    if (ab) return ab
    const sbvid = url.searchParams.get('bvid')
    if (sbvid) ab = abParser(sbvid)
    if (ab) return ab
  } catch {}
  throw new HTTPError('Invalid input format', { status: 400 })
}

export async function TaskPreGen(
  payload: TaskTaskPreGenPayload,
  fastcap_manual?: string,
): Promise<TaskTaskPreGenResult> {
  if (payload.type === 'cid') {
    return {
      aid: 0n,
      bvid: '',
      title: '',
      pubdate: 0,
      upMid: 0n,
      pages: [
        {
          cid: payload.id,
          page: 1,
          part: `cid: ${payload.id}`,
          duration: 0,
        },
      ],
    }
  } else {
    const abid = await inputParser(payload.id)
    const abBasic = getVideoBasic(
      await User.fromRotating(),
      abid.type === 'aid' ? { aid: abid.id } : { bvid: abid.id },
      fastcap_manual,
    )
    return abBasic
  }
}
