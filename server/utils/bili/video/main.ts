import type { User } from '~s/utils/common/user'

import view, { type VideoInfoOpt } from './info'

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
  // videos: number
  pages: VideoPageBasic[]
}

/**
 * 获取视频基础信息（适配 app 初始化使用）
 * - 返回 aid/bvid/title/pubdate/upMid/videos/pages
 */
export async function getVideoBasic(
  user: User,
  opt: VideoInfoOpt,
): Promise<VideoBasic> {
  const data = await view(user, opt)
  return {
    aid: BigInt(data.aid),
    bvid: data.bvid,
    title: data.title,
    pubdate: data.pubdate, // 秒级时间戳（UTC），app 端自行转本地时间
    upMid: BigInt(data.owner.mid),
    // videos: data.videos,
    pages: data.pages.map((p) => ({
      cid: BigInt(p.cid),
      page: p.page,
      part: p.part,
      duration: p.duration,
    })),
  }
}
