import { HTTPError } from 'nitro/h3'
import z from 'zod'
import { JSONBigInt } from '~s/utils/bigint'
import type { User } from '~s/utils/common/user'
import { queueID2params } from '~s/utils/req-limit/id-parser'
import getQueue from '~s/utils/req-limit/p-queue'

const urls = {
  view: 'https://api.bilibili.com/x/web-interface/view',
  wbi_view: 'https://api.bilibili.com/x/web-interface/wbi/view',
}

// 视频基础信息响应
interface VideoInfo {
  code: number
  message: string
  ttl: number
  data: {
    bvid: string
    aid: bigint
    videos: number
    tid: number
    tname: string
    copyright: number
    pic: string
    title: string
    pubdate: number
    ctime: number
    desc: string
    state: number
    duration: number
    rights: {
      bp: number
      elec: number
      download: number
      movie: number
      pay: number
      hd5: number
      no_reprint: number
      autoplay: number
      ugc_pay: number
      is_cooperation: number
    }
    owner: {
      mid: bigint
      name: string
      face: string
    }
    stat: {
      aid: bigint
      view: number
      danmaku: number
      reply: number
      favorite: number
      coin: number
      share: number
      now_rank: number
      his_rank: number
      like: number
      dislike: number
      evaluation: string
    }
    dynamic: string
    cid: bigint
    dimension: {
      width: number
      height: number
      rotate: number
    }
    pages: Array<{
      cid: bigint
      page: number
      from: string
      part: string
      duration: number
      vid: string
      weblink: string
      dimension: {
        width: number
        height: number
        rotate: number
      }
    }>
  }
}

export const VideoInfoOptSchema = z.xor([
  z.object({ aid: z.bigint().positive() }),
  z.object({ bvid: z.string() }),
])
export type VideoInfoOpt = z.infer<typeof VideoInfoOptSchema>

/**
 * 获取视频详细信息(web端)
 * @param opt 查询选项，aid 和 bvid 任选一个
 * @returns 视频详细信息
 */
async function view(user: User, opt: VideoInfoOpt) {
  return (await getQueue()).FastQueue.add(
    async () =>
      user
        .kyInstance()
        .get(
          `${urls.wbi_view}?${await user.encWbi(VideoInfoOptSchema.parse(opt))}`,
          {
            parseJson: JSONBigInt.parse,
          },
        )
        .json<VideoInfo>()
        .then((res) => {
          if (res.code !== 0)
            throw new HTTPError(`获取视频信息失败: ${res.message}`, {
              statusCode: 500,
            })
          return res.data
        }),
    {
      id: queueID2params.encode({ type: 'view', opt }),
    },
  )
}

export default view
