import { UniPool } from '@dan-uni/dan-any'
import z from 'zod'
import type { SeasonModel } from '~/generated/prisma/models'
import { TMDBUrlCRawSchema } from '../3rd-ref/tmdb'
import { prisma } from '../prisma'

export const ssRefSchema = z.discriminatedUnion('src', [
  z.object({ src: z.literal('bgmtv'), subject_id: z.int().positive() }),
  z.object({ src: z.literal('tmdb'), urlc: TMDBUrlCRawSchema.tv.season }),
])

export class Season {
  constructor(public seasonModel: SeasonModel) {}
  get toJSON() {
    return this.seasonModel
  }
  static async create() {
    const model = await prisma.season.create({})
    return new Season(model)
  }
  async del() {
    await prisma.season.delete({ where: { id: this.seasonModel.id } })
  }
  static async loadFromID(id: string) {
    const model = await prisma.season.findUniqueOrThrow({
      where: { id },
    })
    return new Season(model)
  }
  static async list() {
    const eps = await prisma.season.findMany({
      select: { id: true, title: true },
    })
    return eps
  }
  static async listFromSeriesID(seriesId: string) {
    const series = await prisma.season.findMany({
      where: { seriesId },
    })
    return series
  }
  async editTitle(title: string) {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: { title },
    })
  }
  async editRef(ref: z.infer<typeof ssRefSchema>) {
    ref = ssRefSchema.parse(ref)
    if (ref.src === 'bgmtv') {
      this.seasonModel = await prisma.season.update({
        where: { id: this.seasonModel.id },
        data: {
          bgmtv: ref.subject_id,
        },
      })
    } else if (ref.src === 'tmdb') {
      this.seasonModel = await prisma.season.update({
        where: { id: this.seasonModel.id },
        data: {
          tmdb: ref.urlc,
        },
      })
    }
  }
  async setEpisodes(clipIds: string[]) {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: {
        episodes: {
          set: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async addEpisodes(clipIds: string[]) {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: {
        episodes: {
          connect: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async removeEpisodes(clipIds: string[]) {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: {
        episodes: {
          disconnect: clipIds.map((id) => ({ id })),
        },
      },
    })
  }
  async setSeries(seriesId: string | null) {
    seriesId
      ? await this.#addToSeries(seriesId)
      : await this.#removeFromSeries()
  }
  async #addToSeries(seriesId: string) {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: {
        series: {
          connect: { id: seriesId },
        },
      },
    })
  }
  async #removeFromSeries() {
    this.seasonModel = await prisma.season.update({
      where: { id: this.seasonModel.id },
      data: {
        series: {
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
            where: { episode: { seasonId: this.seasonModel.id } },
            select: { danmakuUp: true },
          })
          .then((clips) => clips.map((c) => c.danmakuUp))
      : prisma.clip
          .findMany({
            where: { episode: { seasonId: this.seasonModel.id } },
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
