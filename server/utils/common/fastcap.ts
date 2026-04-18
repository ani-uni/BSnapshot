// 标记方法
// bgmtv.episode_id
// tmdb.urlc (ep级)
// bgmtv.subject_id + sn
// 标准标题(bgmd库) + sn

import { HTTPError } from 'nitro'
import TOML from 'smol-toml'
import z from 'zod'

import { BgmTv } from '../3rd-ref/bgmtv'
import { TMDB, TMDBUrlCRawSchema } from '../3rd-ref/tmdb'
import type { VideoPageBasic } from '../bili/video/main'
import { prisma } from '../prisma'
import type { CaptureCreate } from './capture'
import { Episode, epRefSchema } from './episode'
import { Season, ssRefSchema } from './season'

// 定义见 types/task.ts 中的 ClipSimpleSchema
const FastCapClipSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.int().positive(), // 临时 epid
])

const FastCapEpMapSchema = z.union([
  epRefSchema,
  z.object({
    ssid: z.int().positive(),
    sn: z.number(),
  }),
])

const FastCapSsMapSchema = z.union([
  ssRefSchema,
  z.object({ title: z.string() }),
])

const FastCapMapSchema = z.object({
  ep: z.record(z.string(), FastCapEpMapSchema),
  ss: z.record(z.string(), FastCapSsMapSchema).optional(),
})

export const FastCapSchema = z.object({
  p: z.record(z.string().regex(/^\d+$/), z.array(FastCapClipSchema)),
  m: FastCapMapSchema,
})

// 快速Capture自动解析
// 作用于video级别，即视频简介处填写
export class FastCap {
  constructor(public data: z.infer<typeof FastCapSchema>) {}

  static #ssMapFromSeason(ss: {
    bgmtv: number | null
    tmdb: string | null
    title: string | null
  }): z.infer<typeof FastCapSsMapSchema> {
    if (ss.bgmtv) return { src: 'bgmtv', subject_id: ss.bgmtv }
    if (ss.tmdb)
      return {
        src: 'tmdb',
        urlc: ss.tmdb as
          | z.infer<typeof TMDBUrlCRawSchema.tv.season>
          | z.infer<typeof TMDBUrlCRawSchema.movie>,
      }
    if (ss.title) return { title: ss.title }
    throw new HTTPError('该 season 缺少可用引用（bgmtv/tmdb/title）。', {
      status: 400,
    })
  }

  static async fromEpisode(ep: Episode) {
    const def_clips = [[0, 25 * 60, 0]] as [number, number, number][]
    if (ep.episodeModel.bgmtv) {
      const bgmtv = new BgmTv()
      const data = await bgmtv.getEpisodeInfo(ep.episodeModel.bgmtv)
      const [hh = 0, mm = 0, ss = 0] = data.v0.episodes['{episode_id}'].duration
        .split(':')
        .map((v) => Number(v) || 0)
      const d_sec = hh * 3600 + mm * 60 + ss
      return new FastCap({
        p: {
          1: (d_sec === 0 ? def_clips : [[0, d_sec, 0]]).map(
            (clip) =>
              [clip[0], clip[1], clip[2], 1] as [
                number,
                number,
                number,
                number,
              ],
          ),
        },
        m: {
          ep: {
            1: { src: 'bgmtv', episode_id: ep.episodeModel.bgmtv },
          },
          ss: undefined,
        },
      })
    } else if (ep.episodeModel.tmdb) {
      const tmdb = await TMDB.init()
      const data = await tmdb.getTVEpisodeInfo(ep.episodeModel.tmdb)
      const d_sec = (data.tv.episode.runtime ?? 0) * 60
      return new FastCap({
        p: {
          1: (d_sec === 0 ? def_clips : [[0, d_sec, 0]]).map(
            (clip) =>
              [clip[0], clip[1], clip[2], 1] as [
                number,
                number,
                number,
                number,
              ],
          ),
        },
        m: {
          ep: {
            1: {
              src: 'tmdb',
              urlc: ep.episodeModel.tmdb as z.infer<
                typeof TMDBUrlCRawSchema.tv.episode
              >,
            },
          },
          ss: undefined,
        },
      })
    } else if (ep.episodeModel.seasonId && ep.episodeModel.sn) {
      const ss = await Season.loadFromID(ep.episodeModel.seasonId)
      let clips = def_clips
      if (ss.seasonModel.tmdb?.startsWith('movie/')) {
        const tmdb = await TMDB.init()
        const data = await tmdb.getMovieInfo(
          ss.seasonModel.tmdb as z.infer<typeof TMDBUrlCRawSchema.movie>,
        )
        const d_sec = (data.movie.runtime ?? 0) * 60
        clips = d_sec === 0 ? def_clips : [[0, d_sec, 0]]
      }
      const ssRef = FastCap.#ssMapFromSeason(ss.seasonModel)
      return new FastCap({
        p: {
          1: clips.map(
            (clip) =>
              [clip[0], clip[1], clip[2], 1] as [
                number,
                number,
                number,
                number,
              ],
          ),
        },
        m: {
          ep: {
            1: { ssid: 1, sn: ep.episodeModel.sn },
          },
          ss: {
            1: ssRef,
          },
        },
      })
    }
    throw new HTTPError('该剧集未绑定任何可识别信息，无法生成FastCap', {
      status: 400,
    })
  }
  // /**
  //  * @deprecated 不推荐直接使用批量导出
  //  */
  // static async fromSeason(ss: Season) {
  //   const eps = await Episode.listFromSeasonID(ss.seasonModel.id)
  //   if (ss.seasonModel.bgmtv)
  //     return new FastCap({
  //       p: eps
  //         .map((ep) =>
  //           ep.bgmtv
  //             ? {
  //                 ref: { src: 'bgmtv' as const, episode_id: ep.bgmtv },
  //               }
  //             : null,
  //         )
  //         .filter((v): v is NonNullable<typeof v> => !!v),
  //     })
  //   else if (ss.seasonModel.tmdb)
  //     return new FastCap({
  //       p: eps
  //         .map((ep) =>
  //           ep.tmdb
  //             ? {
  //                 ref: {
  //                   src: 'tmdb' as const,
  //                   urlc: ep.tmdb as z.infer<
  //                     typeof TMDBUrlCRawSchema.tv.episode
  //                   >,
  //                 },
  //               }
  //             : null,
  //         )
  //         .filter((v): v is NonNullable<typeof v> => !!v),
  //     })
  //   else if (ss.seasonModel.title)
  //     return new FastCap({
  //       s: ss.seasonModel.title,
  //       p: eps
  //         .map((ep) => (ep.sn ? { sn: ep.sn } : null))
  //         .filter((v): v is NonNullable<typeof v> => !!v),
  //     })
  //   return null
  // }
  static async fromCaptureCreate(ccs: CaptureCreate[]) {
    if (ccs.length === 0)
      throw new HTTPError(
        'CaptureCreate 数组不能为空。请至少提供一个分P并绑定 clips 后再导出 FastCap。',
        {
          status: 400,
        },
      )
    // FastCap 仅能表示同一视频的分P配置，因此要求 aid 全部存在且一致。
    if (ccs.some((cc) => cc.aid === undefined || cc.aid === null))
      throw new HTTPError(
        '部分 CaptureCreate 缺少 aid。请确保所有分P均来自同一视频后再导出 FastCap。',
        {
          status: 400,
        },
      )
    if (new Set(ccs.map((cc) => cc.aid!.toString())).size !== 1)
      throw new HTTPError(
        'CaptureCreate 的 aid 不一致。请只对同一个视频的分P执行 FastCap 导出。',
        {
          status: 400,
        },
      )

    const pages = ccs.map((cc) => {
      const pageClips = cc.clips
      if (pageClips.length === 0)
        return { clips: [] as [number, number, number, string][] }
      const episodeIdSet = new Set(pageClips.map((c) => c[3]))
      if (episodeIdSet.size !== 1)
        throw new HTTPError('单个分P中的 clips 必须归属于同一个 episode。', {
          status: 400,
        })
      return { clips: pageClips }
    })

    const episodeIds = [
      ...new Set(
        pages.filter((p) => p.clips.length > 0).map((p) => p.clips[0]![3]),
      ),
    ]
    if (episodeIds.length === 0)
      throw new HTTPError(
        '所有分P都为空，无法推断 FastCap 引用。请至少为一个分P绑定剧集。',
        {
          status: 400,
        },
      )

    const episodes = await prisma.episode.findMany({
      where: { id: { in: episodeIds } },
    })
    const episodeMap = new Map(episodes.map((ep) => [ep.id, ep]))
    const missingEpisodeIds = episodeIds.filter((id) => !episodeMap.has(id))
    if (missingEpisodeIds.length > 0)
      throw new HTTPError(
        `存在无效的 episodeId：${missingEpisodeIds.join(', ')}。请确认 clips 中绑定的剧集仍然存在。`,
        {
          status: 400,
        },
      )

    const epIdByEpisodeId = new Map<string, number>()
    const ssIdBySeasonId = new Map<string, number>()
    const mEp: Record<string, z.infer<typeof FastCapEpMapSchema>> = {}
    const mSs: Record<string, z.infer<typeof FastCapSsMapSchema>> = {}

    let epCounter = 0
    let ssCounter = 0

    const pEntries: Record<string, z.infer<typeof FastCapClipSchema>[]> = {}

    for (let i = 0; i < pages.length; i++) {
      const pageKey = String(i + 1)
      const page = pages[i]!
      if (page.clips.length === 0) {
        pEntries[pageKey] = []
        continue
      }

      const episodeId = page.clips[0]![3]
      const ep = episodeMap.get(episodeId)!

      let tempEpId = epIdByEpisodeId.get(episodeId)
      if (!tempEpId) {
        epCounter += 1
        tempEpId = epCounter
        epIdByEpisodeId.set(episodeId, tempEpId)

        if (ep.bgmtv) {
          mEp[tempEpId] = { src: 'bgmtv', episode_id: ep.bgmtv }
        } else if (ep.tmdb) {
          mEp[tempEpId] = {
            src: 'tmdb',
            urlc: ep.tmdb as z.infer<typeof TMDBUrlCRawSchema.tv.episode>,
          }
        } else {
          if (!ep.seasonId || ep.sn === null)
            throw new HTTPError(
              '存在未绑定 episode 级引用且缺少 season/sn 的剧集，无法生成 FastCap 映射。',
              {
                status: 400,
              },
            )

          let tempSsId = ssIdBySeasonId.get(ep.seasonId)
          if (!tempSsId) {
            ssCounter += 1
            tempSsId = ssCounter
            ssIdBySeasonId.set(ep.seasonId, tempSsId)
            const ss = await prisma.season.findUnique({
              where: { id: ep.seasonId },
            })
            if (!ss)
              throw new HTTPError(
                `未找到对应 season（id: ${ep.seasonId}）。请检查 episode 与 season 的关联关系。`,
                {
                  status: 400,
                },
              )
            mSs[tempSsId] = FastCap.#ssMapFromSeason(ss)
          }

          mEp[tempEpId] = { ssid: tempSsId, sn: ep.sn }
        }
      }

      pEntries[pageKey] = page.clips.map(
        (clip) =>
          [clip[0], clip[1], clip[2], tempEpId] as [
            number,
            number,
            number,
            number,
          ],
      )
    }

    const fastcapRaw = {
      p: pEntries,
      m: {
        ep: mEp,
        ss: Object.keys(mSs).length > 0 ? mSs : undefined,
      },
    }

    return new FastCap(FastCapSchema.parse(fastcapRaw))
  }
  async toCaptureCreate(
    aid: bigint,
    vpbs: VideoPageBasic[],
  ): Promise<CaptureCreate[]> {
    const ccs: CaptureCreate[] = []
    const epIdCache = new Map<string, string | null>()

    const resolveEpisodeIdByTempEpid = async (tempEpid: number) => {
      const key = String(tempEpid)
      if (epIdCache.has(key)) return epIdCache.get(key)!
      const epMap = this.data.m.ep[key]
      if (!epMap) {
        epIdCache.set(key, null)
        return null
      }

      let epId: string | null = null
      if ('src' in epMap) {
        const ep = await prisma.episode.findFirst({
          where: {
            bgmtv: epMap.src === 'bgmtv' ? epMap.episode_id : undefined,
            tmdb: epMap.src === 'tmdb' ? epMap.urlc : undefined,
          },
          select: { id: true },
        })
        epId = ep?.id ?? null
      } else {
        const ssMap = this.data.m.ss?.[epMap.ssid]
        if (!ssMap) {
          epIdCache.set(key, null)
          return null
        }
        const ep = await prisma.episode.findFirst({
          where: {
            sn: epMap.sn,
            season:
              'src' in ssMap
                ? ssMap.src === 'bgmtv'
                  ? { bgmtv: ssMap.subject_id }
                  : { tmdb: ssMap.urlc }
                : { title: ssMap.title },
          },
          select: { id: true },
        })
        epId = ep?.id ?? null
      }
      epIdCache.set(key, epId)
      return epId
    }

    for (const vpb of vpbs) {
      const clips = this.data.p[String(vpb.page)] ?? []
      if (clips.length === 0) continue

      const resolvedClips: [number, number, number, string][] = []
      for (const clip of clips) {
        const episodeId = await resolveEpisodeIdByTempEpid(clip[3])
        if (!episodeId) continue
        resolvedClips.push([clip[0], clip[1], clip[2], episodeId])
      }
      if (resolvedClips.length === 0) continue

      ccs.push({
        ...vpb,
        aid,
        clips: resolvedClips,
      })
    }
    return ccs
  }
  static parse(toml: string) {
    const data = FastCapSchema.parse(TOML.parse(toml))
    return new FastCap(data)
  }
  stringify() {
    return TOML.stringify(this.data)
  }
}
