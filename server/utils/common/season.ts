import z from 'zod'
import type { SeasonModel } from '~/generated/prisma/models'
import { TMDBUrlCRawSchema } from '../3rd-ref/tmdb'
import { prisma } from '../prisma'

export const ssRefSchema = z.discriminatedUnion('src', [
  z.object({ src: z.literal('bgmtv'), subject_id: z.int().positive() }),
  z.object({
    src: z.literal('tmdb'),
    urlc: z.union([TMDBUrlCRawSchema.tv.season, TMDBUrlCRawSchema.movie]),
  }),
])

export class Season {
  constructor(public seasonModel: SeasonModel) {}
  toJSON() {
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
}
