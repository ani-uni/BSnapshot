import { UniPool } from '@dan-uni/dan-any'
import { HTTPError } from 'nitro/h3'
import z from 'zod'

import type { EpisodeModel } from '~/generated/prisma/models'

import { TMDBUrlCRawSchema } from '../3rd-ref/tmdb'
import { prisma } from '../prisma'

export const epRefSchema = z.discriminatedUnion('src', [
  z.object({ src: z.literal('bgmtv'), episode_id: z.int().positive() }),
  z.object({ src: z.literal('tmdb'), urlc: TMDBUrlCRawSchema.tv.episode }),
])

export class Episode {
  constructor(public episodeModel: EpisodeModel) {}
  toJSON() {
    return {
      ...this.episodeModel,
      seasonId: this.episodeModel.seasonId ?? 'default',
    }
  }
  static async create(seasonId: null): Promise<Episode>
  static async create(seasonId: string, sn: number): Promise<Episode>
  static async create(seasonId: string | null, sn?: number): Promise<Episode> {
    if (seasonId === null) {
      const model = await prisma.episode.create({
        data: { seasonId: null, sn: null },
      })
      return new Episode(model)
    }
    if (sn === undefined)
      throw new HTTPError('sn is required when seasonId is set', {
        status: 400,
      })
    const model = await prisma.episode.create({ data: { seasonId, sn } })
    return new Episode(model)
  }
  async del() {
    await prisma.episode.delete({ where: { id: this.episodeModel.id } })
  }
  static async loadFromID(id: string) {
    const model = await prisma.episode.findUniqueOrThrow({
      where: { id },
    })
    return new Episode(model)
  }
  static async list(
    /**
     * 是否仅列出无上级(season)的剧集
     */
    def = true,
  ) {
    const episodes = await prisma.episode.findMany({
      where: def ? { seasonId: null } : undefined,
      select: { id: true, title: true },
    })
    return episodes
  }
  static async listFromSeasonID(seasonId: string) {
    const episodes = await prisma.episode.findMany({
      where: { seasonId },
    })
    return episodes
  }
  async editTitle(title: string) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: { title },
    })
  }
  async editRef(ref: z.infer<typeof epRefSchema>) {
    ref = epRefSchema.parse(ref)
    if (ref.src === 'bgmtv') {
      this.episodeModel = await prisma.episode.update({
        where: { id: this.episodeModel.id },
        data: {
          bgmtv: ref.episode_id,
        },
      })
    } else if (ref.src === 'tmdb') {
      this.episodeModel = await prisma.episode.update({
        where: { id: this.episodeModel.id },
        data: {
          tmdb: ref.urlc,
        },
      })
    }
  }
  async setClips(clipIds: string[]) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: {
        clips: {
          set: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async addClips(clipIds: string[]) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: {
        clips: {
          connect: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async removeClips(clipIds: string[]) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: {
        clips: {
          disconnect: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async setSeason(seasonId: null): Promise<void>
  async setSeason(seasonId: string, sn: number): Promise<void>
  async setSeason(seasonId: string | null, sn?: number): Promise<void>
  async setSeason(seasonId: string | null, sn?: number): Promise<void> {
    if (seasonId === null) await this.#removeFromSeason()
    else if (sn !== undefined) {
      await this.#addToSeason(seasonId)
      await this.#editSN(sn)
    } else {
      throw new HTTPError('sn is required when seasonId is set', {
        status: 400,
      })
    }
  }
  async #editSN(sn: number) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: { sn },
    })
  }
  async #addToSeason(seasonId: string) {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: {
        season: {
          connect: { id: seasonId },
        },
      },
    })
  }
  async #removeFromSeason() {
    this.episodeModel = await prisma.episode.update({
      where: { id: this.episodeModel.id },
      data: {
        sn: null,
        season: {
          disconnect: true,
        },
      },
    })
  }
  async getDanmaku(up = false) {
    let pool = UniPool.create({ dedupe: false, dmid: false })
    await (
      up
        ? prisma.clip
            .findMany({
              where: { episodeId: this.episodeModel.id },
              select: { danmakuUp: true, epOffset: true },
            })
            .then((clips) =>
              clips.map((c) => ({ pb: c.danmakuUp, epOffset: c.epOffset })),
            )
        : prisma.clip
            .findMany({
              where: { episodeId: this.episodeModel.id },
              select: { danmaku: true, epOffset: true },
            })
            .then((clips) =>
              clips.map((c) => ({ pb: c.danmaku, epOffset: c.epOffset })),
            )
    ).then((clips) =>
      clips.forEach(({ pb, epOffset }) => {
        if (pb) {
          const danmakuPool = UniPool.fromPb(pb, { dedupe: false, dmid: false })
          // 当按照剧集导出弹幕时，须保证导出弹幕按照剧集与原视频的偏移量进行调整，以保证弹幕时间轴的正确性
          danmakuPool.dans.forEach((d) => {
            d.progress += epOffset
          })
          pool = pool.assign(danmakuPool)
        }
      }),
    )
    return pool
  }
}
