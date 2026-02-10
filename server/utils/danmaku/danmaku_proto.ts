import { UniPool } from '@dan-uni/dan-any'
import type { User } from '../common/user'
import queue from '../req-limit/p-queue'

const url = { seg: 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' }

export async function rt_seg(user: User, oid: bigint, seg: number = 1) {
  if (seg <= 0) throw new Error('seg参数错误')

  return (await queue).SlowQueue.add(
    async () =>
      user
        .kyInstance()
        .get(`${url.seg}?${await user.encWbi({ type: 1, oid, seg })}`)
        .then((res) => res.arrayBuffer())
        .then((buf) =>
          UniPool.fromBiliGrpc(buf, { dedupe: false, dmid: false }),
        ),
    { priority: 101 },
  )
}
