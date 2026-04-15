import { plugins, UniPool } from '@dan-uni/dan-any'
import { DateTime } from 'luxon'
import { HTTPError } from 'nitro/h3'
import z from 'zod'
import { ClipsSchema } from '~s/types/task'
import { his_index, his_pub_to_now } from '~s/utils/bili/danmaku/main'

import {
  LocalHisCacheStatus,
  TaskStatus,
  type TaskType,
} from '~/generated/prisma/enums'
import type {
  CaptureModel,
  ClipModel,
  VideoSourceModel,
} from '~/generated/prisma/models'

import { zeroDate } from '../bili-zero-date'
import { checkVideoAlive } from '../bili/video/main'
import { ClipLintAndFmt } from '../clip-lint-fmt'
import { clips2segs } from '../clips2segs'
import { prisma } from '../prisma'
import { FetchTask, FetchTaskAsQueue } from './fetchtask'
import { User } from './user'

export enum VideoSourceState {
  Alive,
  Restricted, // OnlyUpCanSee
  Dead,
}

export class VideoSource {
  constructor(public videoSourceModel: VideoSourceModel) {}
  static async check() {
    const videoSourcesAlive = await prisma.videoSource.findMany({
      where: { deadAt: null },
      select: { aid: true },
    })
    const videoSources = await Promise.all(
      videoSourcesAlive.map(async ({ aid }) => {
        const ac = await checkVideoAlive(await User.fromRotating(), { aid }) // aliveCheck
        return { ...ac, aid }
      }),
    )
    const now = new Date()
    await prisma.$transaction(
      videoSources.map((vs) =>
        prisma.videoSource.update({
          where: { aid: vs.aid },
          data: vs.alive
            ? { lastRunAt: now, deadAt: null, reason: null, upCanSee: true }
            : {
                lastRunAt: now,
                deadAt: now,
                reason: vs.reason,
                upCanSee: vs.upCanSee,
              },
        }),
      ),
    )
  }
  static async loadFromAid(aid: bigint) {
    const videoSourceModel = await prisma.videoSource.findUniqueOrThrow({
      where: { aid },
    })
    return new VideoSource(videoSourceModel)
  }
  static async loadFromFetchTask(ft: FetchTask) {
    const videoSourceModel = await prisma.videoSource.findFirst({
      where: {
        captures: {
          some: { tasks: { some: { id: ft.fetchTaskModel.id } } },
        },
      },
    })
    if (!videoSourceModel) return null
    return new VideoSource(videoSourceModel)
  }
  async die(upCanSee: boolean, reason: string) {
    const now = new Date()
    this.videoSourceModel = await prisma.videoSource.update({
      where: { aid: this.videoSourceModel.aid },
      data: { lastRunAt: now, deadAt: now, reason, upCanSee },
    })
  }
  async check(conf: FetchTaskAsQueue['conf']) {
    if (this.videoSourceModel.deadAt) return
    if (
      Date.now() <
      this.videoSourceModel.lastRunAt.getTime() + conf.acIntervalSec * 1000
    )
      return
    const ac = await checkVideoAlive(await User.fromRotating(), {
      aid: this.videoSourceModel.aid,
    })
    if (ac.alive === false) await this.die(ac.upCanSee, ac.reason)
    else
      this.videoSourceModel = await prisma.videoSource.update({
        where: { id: this.videoSourceModel.id },
        data: {
          lastRunAt: new Date(),
          deadAt: null,
          reason: null,
          upCanSee: true,
        },
      }) // 考虑视频复活情况
  }
  toJSON() {
    return {
      ...this.videoSourceModel,
      aid: this.videoSourceModel.aid.toString(),
    }
  }
  toState() {
    if (this.videoSourceModel.deadAt) {
      if (this.videoSourceModel.upCanSee) return VideoSourceState.Restricted
      else return VideoSourceState.Dead
    }
    return VideoSourceState.Alive
  }
}

export const CaptureCreateSchema = z.object({
  clips: ClipsSchema,
  cid: z.bigint().positive(),
  aid: z.bigint().positive().optional(),
  pubdate: z.int().nonnegative().optional(),
  upMid: z.bigint().positive().optional(),
})
export type CaptureCreate = z.infer<typeof CaptureCreateSchema>

export class Capture {
  constructor(
    public captureModel: CaptureModel & {
      videoSource?: VideoSourceModel | null
    },
  ) {}
  get videoSource() {
    return this.captureModel.videoSource
      ? new VideoSource(this.captureModel.videoSource)
      : null
  }
  static async create(data: CaptureCreate) {
    const clips = ClipLintAndFmt(data.clips)
    if (clips.length === 0)
      throw new HTTPError('No valid clips provided', { status: 400 })
    const capture_c = await prisma.capture.create({
      data: {
        cid: data.cid,
        pub: data.pubdate ? new Date(data.pubdate * 1000) : zeroDate.toJSDate(),
        upMid: data.upMid ?? null,
        clips: {
          create: clips.map((clip) => ({
            start: clip[0],
            end: clip[1],
            epOffset: clip[2],
            episodeId: clip[3],
          })),
        },
        segs: clips2segs(clips).join(','),
        videoSource: {
          connectOrCreate: data.aid
            ? {
                where: { aid: data.aid },
                create: { aid: data.aid, lastRunAt: new Date(0) },
              }
            : undefined,
        },
      },
      include: { videoSource: true },
    })
    await FetchTask.initForCapture(capture_c.cid)
    return new Capture(capture_c)
  }
  static async loadFromCID(cid: bigint) {
    const captureModel = await prisma.capture.findUniqueOrThrow({
      where: { cid },
      include: { videoSource: true },
    })
    return new Capture(captureModel)
  }
  static async list() {
    const captures = await prisma.capture.findMany({
      include: { videoSource: true },
    })
    return captures.map((c) => new Capture(c).toJSON())
  }
  static async listInfoFromEpisodeID(episodeId: string) {
    const captures = await prisma.capture.findMany({
      where: { clips: { some: { episodeId } } },
      include: { videoSource: true },
    })
    return captures.map((c) => new Capture(c).toJSON())
  }
  static async listInfoFromSeasonID(seasonId: string) {
    const captures = await prisma.capture.findMany({
      where: { clips: { some: { episode: { seasonId } } } },
      include: { videoSource: true },
    })
    return captures.map((c) => new Capture(c).toJSON())
  }
  /**
   * @deprecated 由方法 Capture.createOrToggleFetchTasks 替代
   */
  async createFetchTasks(types?: TaskType[]) {
    return FetchTask.createFromCapture(this.captureModel, types)
  }
  async createOrToggleFetchTasks(types?: TaskType[]) {
    return FetchTask.createOrToggleFromCapture(this.captureModel, types)
  }
  // async updateClips(clips: Clip[]) {
  //   const lintedClips = ClipLintAndFmt(clips)
  //   const segsStr = clips2segs(lintedClips).join(',')
  //   await prisma.capture.update({
  //     where: { cid: this.captureModel.cid },
  //     data: {
  //       clips: {
  //         deleteMany: {},
  //         create: lintedClips.map((clip) => ({
  //           start: clip[0],
  //           end: clip[1],
  //         })),
  //       },
  //       segs: segsStr,
  //     },
  //   })
  // }
  async run(types?: TaskType[], manual = false) {
    if (!types) {
      const fts = await prisma.fetchTask.findMany({
        where: { cid: this.captureModel.cid, status: TaskStatus.PENDING },
      })
      for (const ft of fts) {
        await new FetchTask(ft).run(manual)
      }
    } else {
      manual = true // 指定类型时均为手动执行
      for (const t of types) {
        const ft = await prisma.fetchTask.findUnique({
          where: {
            cid_type: { cid: this.captureModel.cid, type: t },
            status: { notIn: [TaskStatus.DISABLED, TaskStatus.RUNNING] },
          },
        })
        if (ft) await new FetchTask(ft).run(manual)
      }
    }
  }
  static async runAll(types?: TaskType[], manual = false) {
    const captures_raw = await Capture.list()
    for (const c of captures_raw) {
      // const capture = await Capture.loadFromCID(c.cid)
      // 因为这里用到run()方法只需要cid字段
      const capture = new Capture({ cid: BigInt(c.cid) } as CaptureModel)
      await capture.run(types, manual)
    }
  }
  async del() {
    await prisma.capture.delete({
      where: { cid: this.captureModel.cid },
    })
  }
  static async del(cid: bigint) {
    await prisma.capture.delete({
      where: { cid },
    })
  }
  /**
   * @deprecated 仅当通过bili api时调用
   */
  private async saveHisDateMap(
    dayMap: DateTime[],
    from: 'local',
    by: LocalHisCacheStatus,
  ): Promise<void>
  private async saveHisDateMap(dayMap: DateTime[], from: 'cloud'): Promise<void>
  private async saveHisDateMap(
    dayMap: DateTime[],
    from: 'local' | 'cloud',
    by: LocalHisCacheStatus = LocalHisCacheStatus.Await,
  ) {
    // TODO sync暂时没做，到时候要结合cloud状态更新local的处理部分
    if (from === 'local') {
      // 获取已存在的日期
      const existing = await prisma.hisDate.findMany({
        where: { cid: this.captureModel.cid },
        select: { date: true },
      })
      const existingDates = new Set(
        existing.map((e) =>
          DateTime.fromJSDate(e.date)
            .setZone('Asia/Shanghai')
            .toFormat('yyyy-MM-dd'),
        ),
      )
      // 过滤出新的日期
      const newDates = dayMap.filter(
        (d) =>
          !existingDates.has(d.setZone('Asia/Shanghai').toFormat('yyyy-MM-dd')),
      )
      // 批量插入新日期
      if (newDates.length > 0) {
        await prisma.hisDate.createMany({
          data: newDates.map((date) => ({
            cid: this.captureModel.cid,
            date: date.toJSDate(),
            cached: by,
          })),
        })
      }
    }
  }
  /**
   * @deprecated 现在使用反向日期快进算法，可以不通过api拉取index
   */
  async updateHisDateMap(
    /**
     * 若为true，则强制从bili-api获取整个index
     *
     * 若为false，则检查已有map，若某月已存有值则跳过该月
     */
    full = false,
  ) {
    const pub = this.captureModel.pub
    if (!pub) return
    const monthMap = his_pub_to_now(DateTime.fromJSDate(pub))
    const dmap: DateTime[] = []
    try {
      for (const m of monthMap) {
        if (!full) {
          const existing =
            (await prisma.hisDate.findFirst({
              where: {
                cid: this.captureModel.cid,
                date: {
                  gte: m.startOf('month').toJSDate(),
                  lte: m.endOf('month').toJSDate(),
                },
              },
            })) !== null
          if (existing) continue
        }
        const dayMap = await his_index(
          await User.fromRotating(),
          this.captureModel.cid,
          m,
        )
        dmap.push(...dayMap)
      }
    } catch (e) {
      throw new HTTPError('Update History Date Map failed', {
        status: 500,
        cause: e,
      })
    }
    await this.saveHisDateMap(dmap, 'local', LocalHisCacheStatus.Null)
  }
  // TODO cloud同步系统
  // async syncHisDateMap() {}
  async hisDateMapEnlight(danmaku: UniPool, query_history_date: string) {
    // 这里基本上不会出现null情况
    // 该可能已被调用层处理
    const nullOrSD =
      danmaku.dans.length === 0
        ? LocalHisCacheStatus.Null
        : LocalHisCacheStatus.SpecificDate
    const res = danmaku.pipe(
      plugins.bili.bili_history_fast_forward(query_history_date),
    )
    await prisma.$transaction(async (tx) => {
      // 处理 指定日期
      const sdDate = DateTime.fromFormat(query_history_date, 'yyyy-MM-dd', {
        zone: 'Asia/Shanghai',
      })
        .setZone('Asia/Shanghai')
        .toJSDate()
      await tx.hisDate.upsert({
        where: {
          cid_date: {
            cid: this.captureModel.cid,
            date: sdDate,
          },
        },
        // 之前没有获取到过该日期
        create: {
          cid: this.captureModel.cid,
          date: sdDate,
          cached: nullOrSD,
        },
        // 之前通过ff算法确认到过该日期
        update: {
          cached: nullOrSD,
        },
      })
      for (const d of res.skip) {
        const skipDate = DateTime.fromFormat(d, 'yyyy-MM-dd', {
          zone: 'Asia/Shanghai',
        })
          .setZone('Asia/Shanghai')
          .toJSDate()
        const cid_date = {
          cid: this.captureModel.cid,
          date: skipDate,
        }
        const skipRes = await tx.hisDate.findUnique({
          where: { cid_date },
          select: { cached: true },
        })
        if (skipRes) {
          if (skipRes.cached === LocalHisCacheStatus.Await)
            // 万一挤掉弹幕了呢，以前有过就算有吧
            await tx.hisDate.update({
              where: { cid_date },
              data: { cached: LocalHisCacheStatus.Null },
            })
        } else
          await tx.hisDate.create({
            data: {
              cid: this.captureModel.cid,
              date: skipDate,
              cached: LocalHisCacheStatus.Null,
            },
          })
      }
      for (const d of res.FastForward) {
        const ffDate = DateTime.fromFormat(d, 'yyyy-MM-dd', {
          zone: 'Asia/Shanghai',
        })
          .setZone('Asia/Shanghai')
          .toJSDate()
        const cid_date = {
          cid: this.captureModel.cid,
          date: ffDate,
        }
        const ffRes = await tx.hisDate.findUnique({
          where: { cid_date },
          select: { cached: true },
        })
        if (ffRes) {
          if (
            // 为null的情况在理应不发生，但既然这天又出现了弹幕，那就从了吧
            ffRes.cached === LocalHisCacheStatus.Null ||
            ffRes.cached === LocalHisCacheStatus.Await
          )
            await tx.hisDate.update({
              where: { cid_date },
              data: { cached: LocalHisCacheStatus.FastForward },
            })
        } else
          await tx.hisDate.create({
            data: {
              cid: this.captureModel.cid,
              date: ffDate,
              cached: LocalHisCacheStatus.FastForward,
            },
          })
      }
      // 快进所得最早的弹幕不一定完全，所以下一次需从此日开始获取
      if (res.earliest) {
        const el = DateTime.fromFormat(res.earliest, 'yyyy-MM-dd', {
          zone: 'Asia/Shanghai',
        })
          .setZone('Asia/Shanghai')
          .toJSDate()
        const eRes = await tx.hisDate.findUnique({
          where: {
            cid_date: {
              cid: this.captureModel.cid,
              date: el,
            },
          },
          select: { cached: true },
        })
        if (eRes) {
          if (eRes.cached === LocalHisCacheStatus.Null)
            // 凭空冒出来弹幕，很神奇吧(其实不可能)
            await tx.hisDate.update({
              where: {
                cid_date: {
                  cid: this.captureModel.cid,
                  date: el,
                },
              },
              data: { cached: LocalHisCacheStatus.Await },
            })
        } else
          await tx.hisDate.create({
            data: {
              cid: this.captureModel.cid,
              date: el,
              cached: LocalHisCacheStatus.Await,
            },
          })
      }
    })
  }
  async getHisDates(start?: Date, count = 1) {
    // 向前追溯终止日期
    const endPub = this.captureModel.pub
      ? DateTime.fromJSDate(this.captureModel.pub).startOf('day')
      : zeroDate
    const datesMap = new Set<string>()
    // 找到追溯范围内最晚应该获取的日期
    // // 先尝试获取 await 类
    // const startAwait = await prisma.hisDate.findFirst({
    //   where: {
    //     cid: this.captureModel.cid,
    //     date: {
    //       lte: endPub.toJSDate(),
    //     },
    //     cached: LocalHisCacheStatus.Await,
    //   },
    //   orderBy: { date: 'desc' },
    //   select: { date: true },
    // })
    // 从 昨天 开始向前确定需要的日期(防止 今天 还没过完就已被确定性标记)
    let current = (
      start ? DateTime.fromJSDate(start) : DateTime.now().minus({ days: 1 })
    )
      .setZone('Asia/Shanghai')
      .startOf('day')
    while (datesMap.size < count) {
      if (current < endPub) break
      const cDate = await prisma.hisDate.findUnique({
        where: {
          cid_date: {
            cid: this.captureModel.cid,
            date: current.toJSDate(),
          },
        },
        select: { cached: true },
      })
      const add = () => datesMap.add(current.toFormat('yyyy-MM-dd'))
      if (cDate) {
        if (cDate.cached === LocalHisCacheStatus.Await) add()
      } else add()
      current = current.minus({ days: 1 })
    }
    // 再排除
    // const hisDateMap = await prisma.hisDate.findMany({
    //   where: { cid: this.captureModel.cid, cached: LocalHisCacheStatus.Null },
    //   orderBy: { date: 'asc' },
    //   take: count,
    // })
    // return hisDateMap.map((i) =>
    //   DateTime.fromJSDate(i.date)
    //     .setZone('Asia/Shanghai')
    //     .toFormat('yyyy-MM-dd'),
    // )
    return [...datesMap]
  }
  get upLatest() {
    return this.captureModel.upLatest
      ? DateTime.fromJSDate(this.captureModel.upLatest)
          .setZone('Asia/Shanghai')
          .toFormat('yyyy-MM-dd+HH:mm:ss')
      : undefined
  }
  toJSON() {
    return {
      ...this.captureModel,
      cid: this.captureModel.cid.toString(),
      upMid: this.captureModel.upMid?.toString() ?? null,
      videoSource: undefined, // 无须返回该完整字段
      videoSourceId: undefined,
      aid: this.videoSource?.toJSON().aid ?? null,
      videoSourceState: this.videoSource?.toState() ?? null,
    }
  }
  /**
   * 将弹幕库根据clips拆分/削减后保存到各个clip中
   */
  async mergeDanmaku(
    /**
     * 根据该Capture的segs获取到的全部弹幕
     */
    danmaku: UniPool,
    up = false,
    updateCursor = false,
    /**
     * 仅 his 类需要提供
     */
    query_history_date?: string,
  ) {
    const clips = await prisma.clip.findMany({
      where: { cid: this.captureModel.cid },
    })
    // 怎么会呢，既然没有clips，就不会有segs，更不会获取到弹幕了
    if (!clips || clips.length === 0)
      throw new HTTPError('No clips', { status: 500 })
    for (const clip of clips) {
      await new Clip(clip).mergeDanmaku(
        new UniPool(
          danmaku.dans.filter(
            (d) => clip.start <= d.progress && d.progress <= clip.end,
          ),
          { dedupe: false, dmid: false },
        ).pipe(plugins.bili.bili_dedupe.to_bili_deduped),
        up,
      )
    }
    if (updateCursor) {
      if (up) {
        // up接口
        const cursor = danmaku.pipe(plugins.stats.getLatestDan)?.ctime
        // 以上返回null的条件是弹幕池为空，在前面的检查已保证不会出现这种情况
        if (!cursor)
          throw new HTTPError('No cursor found from danmaku', {
            status: 500,
          })
        await prisma.capture.update({
          where: { cid: this.captureModel.cid },
          data: { upLatest: cursor },
        })
      } else {
        // his接口
        if (!query_history_date)
          throw new HTTPError('query_history_date required', {
            status: 500,
          })
        await this.hisDateMapEnlight(danmaku, query_history_date)
      }
    }
  }
  async getDanmaku(up = false) {
    let pool = UniPool.create({ dedupe: false, dmid: false })
    await (
      up
        ? prisma.clip
            .findMany({
              where: { cid: this.captureModel.cid },
              select: { danmakuUp: true },
            })
            .then((clips) => clips.map((c) => c.danmakuUp))
        : prisma.clip
            .findMany({
              where: { cid: this.captureModel.cid },
              select: { danmaku: true },
            })
            .then((clips) => clips.map((c) => c.danmaku))
    ).then((pbs) =>
      pbs.forEach((pb) => {
        if (pb)
          pool = pool.assign(UniPool.fromPb(pb, { dedupe: false, dmid: false }))
      }),
    )
    return pool
  }
}

export class Clip {
  constructor(public clipModel: ClipModel) {}
  static async loadFromID(id: string) {
    const clipModel = await prisma.clip.findUniqueOrThrow({
      where: { id },
    })
    return new Clip(clipModel)
  }
  static async listInfoFromCID(cid: bigint) {
    const clips = await prisma.clip.findMany({
      where: { cid },
      omit: { danmaku: true, danmakuUp: true },
    })
    if (clips.length === 0)
      throw new HTTPError('No clips found', { status: 404 })
    return clips
  }
  static async listInfoFromEpisodeID(episodeId: string) {
    const clips = await prisma.clip.findMany({
      where: { episodeId },
      omit: { danmaku: true, danmakuUp: true },
    })
    return clips
  }
  private async saveDanmaku(danmaku: UniPool, up = false) {
    const d2save = danmaku.dans.length === 0 ? null : danmaku.toPb()
    if (up)
      await prisma.clip.update({
        where: { id: this.clipModel.id },
        data: { danmakuUp: d2save },
      })
    else
      await prisma.clip.update({
        where: { id: this.clipModel.id },
        data: { danmaku: d2save },
      })
  }
  async mergeDanmaku(danmaku: UniPool, up = false) {
    if (danmaku.dans.length === 0) return // 减少比较开销
    const ori = this.clipModel.danmaku
      ? UniPool.fromPb(this.clipModel.danmaku, { dedupe: false, dmid: false })
      : UniPool.create({ dedupe: false, dmid: false })
    const n = ori.assign(danmaku).pipe(plugins.bili.bili_dedupe.to_bili_deduped)
    await this.saveDanmaku(n, up)
  }
  getDanmakuRaw(up = false) {
    return (
      (up ? this.clipModel.danmakuUp : this.clipModel.danmaku) ??
      UniPool.create({ dedupe: false, dmid: false }).toPb()
    )
  }
  async getDanmaku(up = false) {
    const danmakuPb = this.getDanmakuRaw(up)
    return UniPool.fromPb(danmakuPb, { dedupe: false, dmid: false })
  }
  async addToEpisode(epId: string) {
    await prisma.episode.update({
      where: { id: epId },
      data: {
        clips: {
          connect: { id: this.clipModel.id },
        },
      },
    })
  }
  async removeFromEpisode() {
    await prisma.clip.update({
      where: { id: this.clipModel.id },
      data: {
        episode: {
          disconnect: true,
        },
      },
    })
  }
}
