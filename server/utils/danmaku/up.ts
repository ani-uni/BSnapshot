import { UniPool } from '@dan-uni/dan-any'
import qs from 'qs'
import type { User } from '../common/user'
import { SlowQueue } from '../req-limit/p-queue'

const urls = {
  search: 'https://api.bilibili.com/x/v2/dm/search',
}

/**
 * 弹幕搜索分页信息
 */
export interface DanmakuSearchPage {
  /**
   * 当前页码
   */
  num: number
  /**
   * 页大小
   */
  size: number
  /**
   * 搜索到的弹幕总数
   */
  total: number
}

/**
 * 弹幕搜索结果项
 */
export interface DanmakuSearchItem {
  id: bigint
  id_str: string
  type: number
  aid: bigint
  bvid: string
  oid: bigint
  mid: bigint
  mid_hash: string
  pool: number
  attrs: string
  progress: number
  mode: number
  msg: string
  state: number
  fontsize: number
  color: string
  ctime: number
  uname: string
  uface: string
  title: string
  self_seen: boolean
  like_count: number
  user_like: number
  p_title: string
  cover: string
  is_charge: boolean
  is_charge_plus: boolean
  following: boolean
  extra_cps: null
}

/**
 * 弹幕搜索响应
 */
export interface DanmakuSearchResponse {
  code: number
  message: string
  ttl: number
  data: {
    page: DanmakuSearchPage
    result: DanmakuSearchItem[]
  }
}

/**
 * 弹幕搜索选项
 */
export interface DanmakuSearchOptions {
  /** 视频cid */
  oid: bigint
  /** 弹幕类选择，1为视频弹幕，2为漫画弹幕 */
  type?: number
  /** 0为全部弹幕，2为普通弹幕 */
  select_type?: number
  /** 搜索关键词（可为空） */
  keyword?: string
  /** 排序方法，默认为 ctime */
  order?: 'ctime' | 'like_count'
  /** 正/倒序，默认 desc */
  sort?: 'asc' | 'desc'
  /** 分页页数 */
  pn?: number
  /** 分页每页数量，默认为 50 */
  ps?: number
  /** cp过滤 */
  cp_filter?: boolean
  /** 发送者uid列表，以逗号分隔 */
  mids?: string
  /** 视频进度起始值，单位为毫秒 */
  progress_from?: number
  /** 视频进度结束值，单位为毫秒 */
  progress_to?: number
  /** 弹幕模式列表，可为1,4,5,6,7,8,9的一个或多个，以逗号分隔 */
  modes?: string
  /** 弹幕池列表，可为0,1,2的一个或多个，以逗号分隔 */
  pool?: string
  /** 弹幕属性列表，可为1到22的一个或多个，以逗号分隔 */
  attrs?: string
  /** 发送时间起始值，格式为 YYYY-MM-DD+hh:mm:ss */
  ctime_from?: string
  /** 发送时间结束值，格式为 YYYY-MM-DD+hh:mm:ss */
  ctime_to?: string
}

const timeStrRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

/**
 * 搜索弹幕
 * @param user 用户实例
 * @param oid 视频cid
 * @param options 搜索选项（可选）
 * @returns 弹幕搜索结果
 */
export default async function up_seg(
  user: User,
  oid: bigint,
  options: Omit<DanmakuSearchOptions, 'oid'> = {},
) {
  const {
    type = 1,
    select_type = 0,
    keyword = '',
    order = 'ctime',
    sort = 'desc',
    pn = 1,
    ps = 50,
    cp_filter = false,
    mids,
    progress_from,
    progress_to,
    modes,
    pool,
    attrs,
    ctime_from,
    ctime_to,
  } = options

  // 参数验证
  if (oid <= 0) throw new Error('oid参数错误')
  if (type && type <= 0) throw new Error('type参数错误')
  if (pn && pn <= 0) throw new Error('pn参数错误')
  if (ps && ps <= 0) throw new Error('ps参数错误')

  // 验证进度范围
  if (progress_from && progress_from < 0)
    throw new Error('progress_from参数错误：必须为非负整数')
  if (progress_to && progress_to < 0)
    throw new Error('progress_to参数错误：必须为非负整数')
  if (progress_from && progress_to && progress_from > progress_to)
    throw new Error('progress_from 不能大于 progress_to')

  // 验证时间格式（YYYY-MM-DD hh:mm:ss）
  if (ctime_from && timeStrRegex.test(ctime_from) === false)
    throw new Error('ctime_from格式错误：应为 YYYY-MM-DD hh:mm:ss')
  if (ctime_to && timeStrRegex.test(ctime_to) === false)
    throw new Error('ctime_to格式错误：应为 YYYY-MM-DD hh:mm:ss')

  // 验证 modes（可为1,4,5,6,7,8,9）
  if (modes) {
    const validModes = new Set(['1', '4', '5', '6', '7', '8', '9'])
    if (!modes.split(',').every((m) => validModes.has(m.trim())))
      throw new Error('modes参数错误：只能包含1,4,5,6,7,8,9，以逗号分隔')
  }

  // 验证 pool（可为0,1,2）
  if (pool) {
    const validPools = new Set(['0', '1', '2'])
    if (!pool.split(',').every((p) => validPools.has(p.trim())))
      throw new Error('pool参数错误：只能包含0,1,2，以逗号分隔')
  }

  // 验证 attrs（可为1到22）
  if (attrs) {
    const attrList = attrs.split(',')
    for (const attr of attrList) {
      if (Number(attr) < 1 || Number(attr) > 22)
        throw new Error(`attrs参数错误：${attr} 必须在 1-22 范围内`)
    }
  }

  // 验证 mids（应为数字列表）
  if (mids && !mids.split(',').every((m) => /^\d+$/.test(m.trim())))
    throw new Error('mids参数错误：必须为有效的整数列表，以逗号分隔')

  const params: Record<string, unknown> = {
    oid: oid.toString(),
    type,
    select_type,
    keyword,
    order,
    sort,
    pn,
    ps,
    cp_filter,
  }

  // 添加可选参数
  if (mids) params.mids = mids
  if (progress_from) params.progress_from = progress_from
  if (progress_to) params.progress_to = progress_to
  if (modes) params.modes = modes
  if (pool) params.pool = pool
  if (attrs) params.attrs = attrs
  if (ctime_from) params.ctime_from = ctime_from
  if (ctime_to) params.ctime_to = ctime_to

  return SlowQueue.add(
    () =>
      user
        .kyInstance()
        .get(`${urls.search}?${qs.stringify(params)}`)
        .json<DanmakuSearchResponse>()
        .then((res) => {
          if (res.code !== 0) throw new Error(`搜索弹幕失败: ${res.message}`)
          return res
        })
        .then((res) => ({
          page: res.data.page,
          pool: UniPool.fromBiliUp(res, { dedupe: false, dmid: false }),
        })),
    { priority: 102 },
  )
}
