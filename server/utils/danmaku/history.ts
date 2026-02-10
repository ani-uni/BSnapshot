import { UniPool } from '@dan-uni/dan-any'
import { DateTime } from 'luxon'
import qs from 'qs'
import type { User } from '../common/user'
import queue from '../req-limit/p-queue'

const url = {
  index: 'https://api.bilibili.com/x/v2/dm/history/index',
  seg: 'https://api.bilibili.com/x/v2/dm/web/history/seg.so',
}

export type His = DateTime | string
export type HisIndex<T extends His = His> = T[]

/**
 * 获取从发布日期至今的所有历史弹幕月份
 */
export function his_pub_to_now(publish_time: string): HisIndex<string>
export function his_pub_to_now(publish_time: DateTime): HisIndex<DateTime>
export function his_pub_to_now(publish_time: His) {
  const input_type = typeof publish_time
  if (typeof publish_time === 'string')
    publish_time = DateTime.fromFormat(publish_time.slice(0, 7), 'yyyy-MM', {
      zone: 'Asia/Shanghai',
    }) // 月份后面的部分会自动截断
  if (!publish_time.isValid) throw new Error('无效的时间格式')
  const now = DateTime.now().setZone('Asia/Shanghai')
  const months: HisIndex<typeof publish_time> = []

  publish_time = publish_time.setZone('Asia/Shanghai')
  let current = publish_time.startOf('month')
  while (current < now || current.hasSame(now, 'month')) {
    months.push(current)
    current = current.plus({ months: 1 })
  }

  if (input_type === 'string') return months.map((m) => m.toFormat('yyyy-MM'))
  else return months
}

/**
 * 查询历史弹幕日期
 * @param user 用户实例
 * @param oid 视频cid
 * @param month 查询目标年月，格式为 YYYY-MM
 * @returns 存在弹幕的日期列表，格式为 YYYY-MM-DD；若无弹幕则返回 null
 */
export async function his_index(
  user: User,
  oid: bigint,
  month: string,
): Promise<string[]>
export async function his_index(
  user: User,
  oid: bigint,
  month: DateTime,
): Promise<DateTime[]>
export async function his_index(user: User, oid: bigint, month: His) {
  month =
    typeof month === 'string'
      ? month
      : month.setZone('Asia/Shanghai').toFormat('yyyy-MM')
  if (
    !DateTime.fromFormat(month, 'yyyy-MM', { zone: 'Asia/Shanghai' }).isValid
  ) {
    throw new Error('month参数错误')
  }

  return (await queue).SlowQueue.add(
    () =>
      user
        .kyInstance()
        .get(`${url.index}?${qs.stringify({ type: 1, oid, month })}`)
        .json<{
          code: number
          message: string
          ttl: number
          data: string[] | null
        }>()
        .then((res) => {
          if (res.code !== 0)
            throw new Error(`查询历史弹幕日期失败: ${res.message}`)
          return res.data
        })
        .then((data) => {
          if (data === null) return []
          else
            return typeof month === 'string'
              ? data
              : data.map((date) =>
                  DateTime.fromFormat(date, 'yyyy-MM-dd', {
                    zone: 'Asia/Shanghai',
                  }),
                )
        }),
    { priority: 100 },
  )
}

/**
 * 获取历史弹幕 (protobuf 格式)
 * @param user 用户实例
 * @param oid 视频cid
 * @param date 弹幕日期，格式为 YYYY-MM-DD
 * @returns 包含该日期所有弹幕的 UniPool 对象
 */
export async function his_seg(user: User, oid: bigint, date: His) {
  date =
    typeof date === 'string'
      ? date
      : date.setZone('Asia/Shanghai').toFormat('yyyy-MM-dd')
  if (
    !DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Shanghai' }).isValid
  ) {
    throw new Error('date参数错误')
  }

  return (await queue).SlowQueue.add(
    () =>
      user
        .kyInstance()
        .get(`${url.seg}?${qs.stringify({ type: 1, oid, date })}`)
        .then((res) => res.arrayBuffer())
        .then((buf) =>
          UniPool.fromBiliGrpc(buf, { dedupe: false, dmid: false }),
        ),
    { priority: 104 },
  )
}
