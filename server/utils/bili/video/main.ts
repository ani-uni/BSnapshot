import type { CaptureCreate } from '~s/utils/common/capture'
import { FastCap } from '~s/utils/common/fastcap'
import type { User } from '~s/utils/common/user'

import { view, viewWithoutInfo, type VideoInfoOpt } from './info'

export type VideoPageBasic = {
  cid: bigint
  page: number
  part: string
  duration: number
}

export type VideoBasic = {
  aid: bigint
  bvid: string
  title: string
  pubdate: number
  upMid: bigint
  // desc: string
  // videos: number
  pages: VideoPageBasic[]
  preset?: CaptureCreate[]
}

/**
 * 获取视频基础信息（适配 app 初始化使用）
 * - 返回 aid/bvid/title/pubdate/upMid/videos/pages
 */
export async function getVideoBasic(
  user: User,
  opt: VideoInfoOpt,
  fastcap_manual?: string,
): Promise<VideoBasic> {
  const data = await view(user, opt)
  const vpbs = data.pages.map((p) => ({
    cid: BigInt(p.cid),
    page: p.page,
    part: p.part,
    duration: p.duration,
  }))
  // 解析fastcap失效则无视
  const fastcap_str = (fastcap_manual || data.desc)
    .match(/```fastcap([\s\S]*?)```/i)?.[1]
    ?.trim()
  let preset: CaptureCreate[] | undefined = undefined
  try {
    if (fastcap_str) {
      const fastcap = FastCap.parse(fastcap_str)
      preset = await fastcap.toCaptureCreate(data.aid, vpbs)
    }
  } catch {}
  return {
    aid: BigInt(data.aid),
    bvid: data.bvid,
    title: data.title,
    pubdate: data.pubdate, // 秒级时间戳（UTC），app 端自行转本地时间
    upMid: BigInt(data.owner.mid),
    // desc: data.desc, // 简介
    // videos: data.videos,
    pages: vpbs,
    preset,
  }
}

export async function checkVideoAlive(user: User, opt: VideoInfoOpt) {
  return viewWithoutInfo(user, opt)
}
