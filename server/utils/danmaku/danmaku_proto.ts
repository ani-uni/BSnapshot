import { UniPool } from '@dan-uni/dan-any'
import qs from 'qs'
import type { User } from '../common/user'

const url = { seg: 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' }

export async function rt_seg(user: User, oid: bigint, seg: number = 1) {
  if (seg <= 0) throw new Error('seg参数错误')

  return user
    .kyInstance()
    .get(`${url.seg}?${qs.stringify({ type: 1, oid, seg })}`)
    .then((res) => res.arrayBuffer())
    .then((buf) => UniPool.fromBiliGrpc(buf, { dedupe: false, dmid: false }))
}
