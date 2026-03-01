import { UniPool } from '@dan-uni/dan-any'
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
    return this.episodeModel
  }
  static async create() {
    const model = await prisma.episode.create({})
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
  async setSeason(seasonId: string | null) {
    seasonId
      ? await this.#addToSeason(seasonId)
      : await this.#removeFromSeason()
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
        season: {
          disconnect: true,
        },
      },
    })
  }
  async getDanmaku(up = false) {
    let pool = UniPool.create({ dedupe: false, dmid: false })
    await (up
      ? prisma.clip
          .findMany({
            where: { episodeId: this.episodeModel.id },
            select: { danmakuUp: true },
          })
          .then((clips) => clips.map((c) => c.danmakuUp))
      : prisma.clip
          .findMany({
            where: { episodeId: this.episodeModel.id },
            select: { danmaku: true },
          })
          .then((clips) => clips.map((c) => c.danmaku))
    ).then((pbs) =>
      pbs.forEach((pb) => {
        if (pb) pool = pool.assign(UniPool.fromPb(pb))
      }),
    )
    return pool
  }
}
