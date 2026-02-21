import { UniPool } from '@dan-uni/dan-any'
import { DateTime } from 'luxon'
import { HTTPError } from 'nitro/h3'
import { Event } from '~s/utils/common/event'
import type { User } from '~s/utils/common/user'
import { rt_seg } from './danmaku_proto'
import { command_seg } from './danmaku_view_proto'
import { type HisIndex, his_seg } from './history'
import up_seg from './up'

/**
 * @param duration 视频单P时长，单位: s
 */
export function duration2segs(duration: number) {
  if (duration <= 0)
    throw new HTTPError('duration参数错误', { statusCode: 400 })

  return Math.ceil(duration / 3600)
}

/**
 * @param oid 视频cid
 * @param segs 最大seg值(起始值为1)
 * @returns
 */
export async function rt(user: User, oid: bigint, segs: number[] = [1]) {
  if (segs.some((seg) => seg <= 0))
    throw new HTTPError('seg参数错误', { statusCode: 400 })

  let pool = UniPool.create({ dedupe: false, dmid: false })
  for (const seg of segs) {
    pool = await rt_seg(user, oid, seg).then((p) => pool.assign(p))
    await Event.info(
      `获取实时弹幕 - oid: ${oid}`,
      '本次请求获取弹幕数统计',
      `弹幕总数: ${pool.dans.length}`,
    )
  }
  return pool
}

export async function his(user: User, oid: bigint, dates: HisIndex) {
  let pool = UniPool.create({ dedupe: false, dmid: false })
  for (const date of dates) {
    pool = await his_seg(user, oid, date).then((p) => pool.assign(p))
    await Event.info(
      `获取历史弹幕 - oid: ${oid}`,
      '本次请求获取弹幕数统计',
      `弹幕总数: ${pool.dans.length}`,
    )
  }
  return pool
}
export { his_index, his_pub_to_now } from './history'

export async function sp(user: User, oid: bigint) {
  return command_seg(user, oid)
}

export async function up(
  user: User,
  oid: bigint,
  // pages: number[] = [1],
  ctime_from?: string,
  ps: number = 500,
) {
  // let pool = UniPool.create({ dedupe: false, dmid: false })
  // for (const page of pages) {
  const pool = await up_seg(user, oid, {
    // pn: page,
    pn: 1,
    ps,
    ctime_from,
    order: 'ctime',
    sort: 'asc',
  })
  // pool = pool.assign(res.pool)
  // }
  return pool.pool
}
export async function up_as_his(user: User, oid: bigint, dates: HisIndex) {
  const ds = dates.map((d) => {
    const n: DateTime = (
      typeof d === 'string'
        ? DateTime.fromFormat(d, 'yyyy-MM-dd', { zone: 'Asia/Shanghai' })
        : d
    ).setZone('Asia/Shanghai')
    return {
      ctime_from: n.startOf('day').toFormat('yyyy-MM-dd+HH:mm:ss'),
      ctime_to: n.endOf('day').toFormat('yyyy-MM-dd+HH:mm:ss'),
    }
  })
  let pool = UniPool.create({ dedupe: false, dmid: false })
  for (const date of ds) {
    pool = await up_seg(user, oid, {
      pn: 1,
      ps: 6000,
      ctime_from: date.ctime_from,
      ctime_to: date.ctime_to,
      order: 'ctime',
      sort: 'asc',
    }).then((p) => pool.assign(p.pool))
  }
  return pool
}
