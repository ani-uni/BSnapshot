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
const FastCapClipSchema = z.tuple([z.number(), z.number(), z.number()])
const FastCapClipsObjectSchema = z.object({
  c: z.array(FastCapClipSchema).optional(),
})

export const FastCapSchema = z.xor([
  z.object({
    p: z.array(
      FastCapClipsObjectSchema.extend(z.object({ ref: epRefSchema }).shape),
    ),
  }),
  z.object({
    ref: ssRefSchema,
    p: z.array(
      FastCapClipsObjectSchema.extend(z.object({ sn: z.number() }).shape),
    ),
  }),
  z.object({
    // search
    s: z.string(),
    // part
    p: z.array(
      FastCapClipsObjectSchema.extend(z.object({ sn: z.number() }).shape),
    ),
  }),
])

// 快速Capture自动解析
// 作用于video级别，即视频简介处填写
export class FastCap {
  constructor(public data: z.infer<typeof FastCapSchema>) {}
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
        p: [
          {
            c: d_sec === 0 ? def_clips : [[0, d_sec, 0]],
            ref: { src: 'bgmtv', episode_id: ep.episodeModel.bgmtv },
          },
        ],
      })
    } else if (ep.episodeModel.tmdb) {
      const tmdb = await TMDB.init()
      const data = await tmdb.getTVEpisodeInfo(ep.episodeModel.tmdb)
      const d_sec = (data.tv.episode.runtime ?? 0) * 60
      return new FastCap({
        p: [
          {
            c: d_sec === 0 ? def_clips : [[0, d_sec, 0]],
            ref: {
              src: 'tmdb',
              urlc: ep.episodeModel.tmdb as z.infer<
                typeof TMDBUrlCRawSchema.tv.episode
              >,
            },
          },
        ],
      })
    } else if (ep.episodeModel.seasonId && ep.episodeModel.sn) {
      const ss = await Season.loadFromID(ep.episodeModel.seasonId)
      if (ss.seasonModel.bgmtv)
        return new FastCap({
          ref: { src: 'bgmtv', subject_id: ss.seasonModel.bgmtv },
          p: [{ c: def_clips, sn: ep.episodeModel.sn }],
        })
      else if (ss.seasonModel.tmdb) {
        let d_sec = 0
        if (ss.seasonModel.tmdb.startsWith('movie/')) {
          const tmdb = await TMDB.init()
          const data = await tmdb.getMovieInfo(
            ss.seasonModel.tmdb as z.infer<typeof TMDBUrlCRawSchema.movie>,
          )
          d_sec = (data.movie.runtime ?? 0) * 60
        }
        return new FastCap({
          ref: {
            src: 'tmdb',
            urlc: ss.seasonModel.tmdb as z.infer<
              typeof TMDBUrlCRawSchema.tv.season
            >,
          },
          p: [
            {
              c: d_sec === 0 ? def_clips : [[0, d_sec, 0]],
              sn: ep.episodeModel.sn,
            },
          ],
        })
      } else if (ss.seasonModel.title)
        return new FastCap({
          s: ss.seasonModel.title,
          p: [{ c: def_clips, sn: ep.episodeModel.sn }],
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
  async toCaptureCreate(
    aid: bigint,
    vpbs: VideoPageBasic[],
  ): Promise<CaptureCreate[]> {
    const ccs: CaptureCreate[] = []
    for (const vpb of vpbs) {
      const dp = this.data.p.at(vpb.page - 1)
      if (!dp?.c) continue
      const ep = await prisma.episode.findFirst({
        where: {
          bgmtv:
            'ref' in dp && dp.ref?.src === 'bgmtv'
              ? dp.ref.episode_id
              : undefined,
          tmdb: 'ref' in dp && dp.ref?.src === 'tmdb' ? dp.ref.urlc : undefined,
          sn: 'sn' in dp ? dp.sn : undefined,
          season:
            'ref' in this.data &&
            (this.data.ref?.src === 'bgmtv' || this.data.ref?.src === 'tmdb')
              ? {
                  bgmtv:
                    this.data.ref.src === 'bgmtv'
                      ? this.data.ref.subject_id
                      : undefined,
                  tmdb:
                    this.data.ref.src === 'tmdb'
                      ? this.data.ref.urlc
                      : undefined,
                }
              : 's' in this.data
                ? { title: this.data.s }
                : undefined,
        },
      })
      if (!ep) continue
      ccs.push({
        ...vpb,
        aid,
        clips: dp.c.map<[number, number, number, string]>((clip) => [
          clip[0],
          clip[1],
          clip[2],
          ep.id,
        ]),
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
