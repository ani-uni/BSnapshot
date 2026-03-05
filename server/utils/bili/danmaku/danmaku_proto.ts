import { UniPool } from '@dan-uni/dan-any'
import { HTTPError } from 'nitro/h3'
import { Event } from '~s/utils/common/event'
import type { User } from '~s/utils/common/user'
import { queueID2params } from '~s/utils/req-limit/id-parser'
import getQueue from '~s/utils/req-limit/p-queue'

const url = { seg: 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so' }

export async function rt_seg(user: User, oid: bigint, seg: number = 1) {
  if (seg <= 0) throw new HTTPError('seg参数错误', { status: 400 })

  const e = new Event(`请求实时弹幕 - oid: ${oid}, seg: ${seg}`)
  await e.log('开始请求')

  return (await getQueue()).SlowQueue.add(
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
          } catch (err) {
            throw e.err(
              '解析失败',
              new HTTPError(Buffer.from(buf).toString(), {
                status: 500,
                cause: err,
              }),
            )
          }
        })
        .then(async (pool) => {
          await e.log('获取成功', `弹幕数: ${pool.dans.length}`)
          return pool
        }),
    { priority: 101, id: queueID2params.encode({ type: 'rt_seg', oid, seg }) },
  )
}
