import { UniPool } from '@dan-uni/dan-any'
import qs from 'qs'
import z from 'zod'
import {
  StringFormatUpSegOptAttrs,
  StringFormatUpSegOptCtime,
  StringFormatUpSegOptMids,
  StringFormatUpSegOptModes,
  StringFormatUpSegOptPool,
} from '~/server/types/utils/danmaku'
import type { User } from '../common/user'
import { queueID2params } from '../req-limit/id-parser'
import queue from '../req-limit/p-queue'

const urls = {
  search: 'https://api.bilibili.com/x/v2/dm/search',
}

/**
 * 弹幕搜索分页信息
 */
export const DanmakuSearchPageSchema = z.object({
  /** 当前页码 */
  num: z.int(),
  /** 页大小 */
  size: z.int(),
  /** 搜索到的弹幕总数 */
  total: z.int(),
})
export type DanmakuSearchPage = z.infer<typeof DanmakuSearchPageSchema>

/**
 * 弹幕搜索结果项
 */
export const DanmakuSearchItemSchema = z.object({
  id: z.bigint(),
  id_str: z.string(),
  type: z.int(),
  aid: z.bigint(),
  bvid: z.string(),
  oid: z.bigint(),
  mid: z.bigint(),
  mid_hash: z.string(),
  pool: z.int(),
  attrs: z.string(),
  progress: z.number(),
  mode: z.int(),
  msg: z.string(),
  state: z.int(),
  fontsize: z.int(),
  color: z.string(),
  ctime: z.int(),
  uname: z.string(),
  uface: z.string(),
  title: z.string(),
  self_seen: z.boolean(),
  like_count: z.int(),
  user_like: z.int(),
  p_title: z.string(),
  cover: z.string(),
  is_charge: z.boolean(),
  is_charge_plus: z.boolean(),
  following: z.boolean(),
  extra_cps: z.null(),
})
export type DanmakuSearchItem = z.infer<typeof DanmakuSearchItemSchema>

/**
 * 弹幕搜索响应
 */
export const DanmakuSearchResponseSchema = z.object({
  code: z.int(),
  message: z.string(),
  ttl: z.int(),
  data: z.object({
    page: DanmakuSearchPageSchema,
    result: DanmakuSearchItemSchema.array(),
  }),
})
export type DanmakuSearchResponse = z.infer<typeof DanmakuSearchResponseSchema>

/**
 * 弹幕搜索选项
 */
export const DanmakuSearchOptionsSchema = z.object({
  /** 视频cid */
  oid: z.bigint().positive(),
  /** 弹幕类选择，1为视频弹幕，2为漫画弹幕 */
  type: z
    .union([z.literal(1), z.literal(2)])
    .default(1)
    .optional(),
  /** 0为全部弹幕，2为普通弹幕 */
  select_type: z
    .union([z.literal(0), z.literal(2)])
    .default(0)
    .optional(),
  /** 搜索关键词（可为空） */
  keyword: z.string().optional(),
  /** 排序方法，默认为 ctime */
  order: z.enum(['ctime', 'like_count']).default('ctime').optional(),
  /** 正/倒序，默认 desc */
  sort: z.enum(['asc', 'desc']).default('desc').optional(),
  /** 分页页数 */
  pn: z.int().positive().default(1).optional(),
  /** 分页每页数量，默认为 50 */
  ps: z.int().positive().default(50).optional(),
  /** cp过滤 */
  cp_filter: z.boolean().optional(),
  /** 发送者uid列表，以逗号分隔 */
  mids: StringFormatUpSegOptMids.optional(),
  /** 视频进度起始值，单位为毫秒 */
  progress_from: z.int().nonnegative().optional(),
  /** 视频进度结束值，单位为毫秒 */
  progress_to: z.int().nonnegative().optional(),
  /** 弹幕模式列表，可为1,4,5,6,7,8,9的一个或多个，以逗号分隔 */
  modes: StringFormatUpSegOptModes.optional(),
  /** 弹幕池列表，可为0,1,2的一个或多个，以逗号分隔 */
  pool: StringFormatUpSegOptPool.optional(),
  /** 弹幕属性列表，可为1到22的一个或多个，以逗号分隔 */
  attrs: StringFormatUpSegOptAttrs.optional(),
  /** 发送时间起始值，格式为 YYYY-MM-DD+hh:mm:ss */
  ctime_from: StringFormatUpSegOptCtime.optional(),
  /** 发送时间结束值，格式为 YYYY-MM-DD+hh:mm:ss */
  ctime_to: StringFormatUpSegOptCtime.optional(),
})
export type DanmakuSearchOptions = z.infer<typeof DanmakuSearchOptionsSchema>

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
  options?: Omit<DanmakuSearchOptions, 'oid'>,
) {
  const params = z.parse(DanmakuSearchOptionsSchema, options)
  // 验证进度范围
  if (
    params.progress_from &&
    params.progress_to &&
    params.progress_from > params.progress_to
  )
    throw new Error('progress_from 不能大于 progress_to')

  return (await queue()).SlowQueue.add(
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
    {
      priority: 102,
      id: queueID2params.encode({ type: 'up_seg', oid, options: params }),
    },
  )
}
