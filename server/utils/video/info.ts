import { HTTPError } from 'nitro/h3'
import { JSONBigInt } from '../bigint'
import type { User } from '../common/user'
import queue from '../req-limit/p-queue'

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

/**
 * 获取视频详细信息(web端)
 * @param opt 查询选项，aid 和 bvid 任选一个
 * @returns 视频详细信息
 */
async function view(user: User, opt: { aid?: bigint; bvid?: string }) {
  const { aid, bvid } = opt

  // 参数验证
  if (!aid && !bvid)
    throw new HTTPError('aid 和 bvid 必须提供一个', { statusCode: 400 })
  if (aid && aid <= 0n) throw new HTTPError('aid 参数错误', { statusCode: 400 })
  if (bvid && typeof bvid !== 'string')
    throw new HTTPError('bvid 参数错误', { statusCode: 400 })

  const queryParam = aid ? { aid } : { bvid }

  return (await queue()).FastQueue.add(async () =>
    user
      .kyInstance()
      .get(`${urls.wbi_view}?${await user.encWbi(queryParam)}`, {
        parseJson: JSONBigInt.parse,
      })
      .json<VideoInfo>()
      .then((res) => {
        if (res.code !== 0)
          throw new HTTPError(`获取视频信息失败: ${res.message}`, {
            statusCode: 500,
          })
        return res.data
      }),
  )
}

export default view
