import z from 'zod'
import type { SeriesModel } from '~/generated/prisma/models'
import { TMDBUrlCRawSchema } from '../3rd-ref/tmdb'
import { prisma } from '../prisma'

export const seriesRefSchema = z.object({
  src: z.literal('tmdb'),
  urlc: TMDBUrlCRawSchema.tv.season,
})

export class Series {
  constructor(public seriesModel: SeriesModel) {}
  get toJSON() {
    return this.seriesModel
  }
  static async create() {
    const model = await prisma.series.create({})
    return new Series(model)
  }
  async del() {
    await prisma.series.delete({ where: { id: this.seriesModel.id } })
  }
  static async loadFromID(id: string) {
    const model = await prisma.series.findUniqueOrThrow({
      where: { id },
    })
    return new Series(model)
  }
  static async list() {
    const eps = await prisma.series.findMany({
      select: { id: true, title: true },
    })
    return eps
  }
  async editTitle(title: string) {
    this.seriesModel = await prisma.series.update({
      where: { id: this.seriesModel.id },
      data: { title },
    })
  }
  async editRef(ref: z.infer<typeof seriesRefSchema>) {
    ref = seriesRefSchema.parse(ref)
    if (ref.src === 'tmdb') {
      this.seriesModel = await prisma.series.update({
        where: { id: this.seriesModel.id },
        data: {
          tmdb: ref.urlc,
        },
      })
    }
  }
  async setSeasons(seasonIds: string[]) {
    this.seriesModel = await prisma.series.update({
      where: { id: this.seriesModel.id },
      data: {
        seasons: {
          set: seasonIds.map((id) => ({ id })),
        },
      },
    })
  }
  async addSeasons(seasonIds: string[]) {
    this.seriesModel = await prisma.series.update({
      where: { id: this.seriesModel.id },
      data: {
        seasons: {
          connect: seasonIds.map((id) => ({ id })),
        },
      },
    })
  }
  async removeSeasons(seasonIds: string[]) {
    this.seriesModel = await prisma.series.update({
      where: { id: this.seriesModel.id },
      data: {
        seasons: {
          disconnect: seasonIds.map((id) => ({ id })),
        },
      },
    })
  }
}
