import { UniPool } from '@dan-uni/dan-any'
import moment from 'moment'
import qs from 'qs'
import type { User } from '../common/user'

const url = {
  index: 'https://api.bilibili.com/x/v2/dm/history/index',
  seg: 'https://api.bilibili.com/x/v2/dm/web/history/seg.so',
}

export type His = moment.Moment | string
export type HisIndex<T = His> = T[]

/**
 * 获取从发布月至今的所有历史弹幕月份
 */
export function his_pub_to_now(publish_time: His) {
  if (typeof publish_time === 'string') publish_time = moment(publish_time)
  if (!publish_time.isValid()) throw new Error('无效的时间格式')
  const now = moment()
  const months: HisIndex<typeof publish_time> = []

  const current = publish_time.clone().startOf('month')
  while (current.isBefore(now) || current.isSame(moment(), 'month')) {
    months.push(current.clone())
    current.add(1, 'month')
  }

  if (typeof publish_time === 'string')
    return months.map((m) => m.format('YYYY-MM')) as HisIndex<string>
  else return months
}

/**
 * 查询历史弹幕日期
 * @param user 用户实例
 * @param oid 视频cid
 * @param month 查询目标年月，格式为 YYYY-MM
 * @returns 存在弹幕的日期列表，格式为 YYYY-MM-DD；若无弹幕则返回 null
 */
export async function his_index(user: User, oid: bigint, month: His) {
  // 使用 moment 验证 YYYY-MM 格式
  if (!moment(month, 'YYYY-MM', true).isValid()) {
    throw new Error('month参数错误')
  }
  month = typeof month === 'string' ? month : month.format('YYYY-MM')

  return user
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
          : data.map((date) => moment(date))
    })
}

/**
 * 获取历史弹幕 (protobuf 格式)
 * @param user 用户实例
 * @param oid 视频cid
 * @param date 弹幕日期，格式为 YYYY-MM-DD
 * @returns 包含该日期所有弹幕的 UniPool 对象
 */
export async function his_seg(user: User, oid: bigint, date: His) {
  // 使用 moment 验证 YYYY-MM-DD 格式
  if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
    throw new Error('date参数错误')
  }
  date = typeof date === 'string' ? date : date.format('YYYY-MM-DD')

  return user
    .kyInstance()
    .get(`${url.seg}?${qs.stringify({ type: 1, oid, date })}`)
    .then((res) => res.arrayBuffer())
    .then((buf) => UniPool.fromBiliGrpc(buf, { dedupe: false, dmid: false }))
}
