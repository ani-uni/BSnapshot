import { UniPool } from '@dan-uni/dan-any'
import { HTTPError } from 'nitro/h3'
import type { User } from '../common/user'
import queue from '../req-limit/p-queue'

const url = { seg: 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' }

export async function rt_seg(user: User, oid: bigint, seg: number = 1) {
  if (seg <= 0) throw new Error('seg参数错误')

  return (await queue()).SlowQueue.add(
    async () =>
      user
        .kyInstance()
        .get(
          `${url.seg}?${await user.encWbi({ type: 1, oid, segment_index: seg })}`,
        )
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          try {
            return UniPool.fromBiliGrpc(buf, { dedupe: false, dmid: false })
          } catch {
            throw new HTTPError(Buffer.from(buf).toString(), {
              statusCode: 500,
            })
          }
        }),
    { priority: 101 },
  )
}
