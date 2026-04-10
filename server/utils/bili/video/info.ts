import { HTTPError } from 'nitro/h3'
import z from 'zod'
import { JSONBigInt } from '~s/utils/bigint'
import { Event } from '~s/utils/common/event'
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
            parseJson: (text) => JSONBigInt.parse(text),
          },
        )
        .json<VideoInfo>()
        .then((res) => {
          if (res.code !== 0)
            throw new HTTPError(`获取视频信息失败: ${res.message}`, {
              status: 500,
            })
          return res.data
        }),
    {
      id: queueID2params.encode({ type: 'view', opt }),
    },
  )
}

/**
 * 参数与上方函数相同，仅用于检测视频是否存活，不进行其它信息处理
 */
async function viewWithoutInfo(
  user: User,
  opt: VideoInfoOpt,
): Promise<
  { alive: false; upCanSee: boolean; reason: string } | { alive: true }
> {
  return (await getQueue()).SlowQueue.add(
    async () =>
      user
        .kyInstance()
        .get(
          `${urls.view}?${await user.encWbi(VideoInfoOptSchema.parse(opt))}`,
          {
            parseJson: (text) => JSONBigInt.parse(text),
          },
        )
        .json<VideoInfo>()
        .then((res) => {
          if (res.code !== 0) {
            const e = new Event('视频存活检测')
            const reason = `错误码: ${res.code}, 错误信息: ${res.message}`
            if ('aid' in opt) e.warn(`aid: ${opt.aid}`, reason)
            else e.warn(`bvid: ${opt.bvid}`, reason)
            return { alive: false, upCanSee: res.code === 62012, reason }
          } else return { alive: true }
        }),
    { id: queueID2params.encode({ type: 'viewWithoutInfo', opt }) },
  )
}

export { view, viewWithoutInfo }
