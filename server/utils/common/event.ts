import { useStorage } from 'nitro/storage'
import z from 'zod'

import { EventLevel } from '~/generated/prisma/enums'

import { prisma } from '../prisma'

export const eventConfSchema = z.object({
  autoDelTimeAway: z.int().nonnegative().nullish(), // 自动清理n秒前的事件，0为不自动清理
  autoDelCountAway: z.int().nonnegative().nullish(), // 自动清理超过n条的事件，0为不自动清理
})
export type EventConf = z.infer<typeof eventConfSchema>

export class Event {
  constructor(private src: string) {}
  static async getConf() {
    const storage = useStorage('event')
    return {
      autoDelTimeAway:
        (await storage.getItem<EventConf['autoDelTimeAway']>(
          'autoDelTimeAway',
        )) ?? 7 * 24 * 3600, // 默认7天
      autoDelCountAway:
        (await storage.getItem<EventConf['autoDelCountAway']>(
          'autoDelCountAway',
        )) ?? 1000, // 默认1000条
    }
  }
  static async setConf(conf: EventConf) {
    const storage = useStorage('event')
    if (conf.autoDelTimeAway !== undefined)
      await storage.setItem('autoDelTimeAway', conf.autoDelTimeAway)
    if (conf.autoDelCountAway !== undefined)
      await storage.setItem('autoDelCountAway', conf.autoDelCountAway)
    return this.getConf()
  }
  static async info(src: string, msg: string, params: string = '') {
    await prisma.event.create({
      data: {
        type: EventLevel.INFO,
        msg: `[${src}] <${msg}> ${params}`,
      },
    })
  }
  static async warning(src: string, msg: string, params: string = '') {
    await prisma.event.create({
      data: {
        type: EventLevel.WARNING,
        msg: `[${src}] <${msg}> ${params}`,
      },
    })
  }
  static async error(src: string, msg: string, err: Error) {
    await prisma.event.create({
      data: {
        type: EventLevel.ERROR,
        msg: `[${src}] <${msg}> ${err.message}`,
      },
    })
    return err
  }
  async log(msg: string, params: string = '') {
    await Event.info(this.src, msg, params)
  }
  async warn(msg: string, params: string = '') {
    await Event.warning(this.src, msg, params)
  }
  async err(msg: string, err: Error) {
    return await Event.error(this.src, msg, err)
  }
  static async listEvents(after?: number) {
    const events = await prisma.event.findMany({
      where: after ? { id: { gt: after } } : {},
      orderBy: { ctime: 'asc' },
    })
    return events
  }
  static async cleanEvents() {
    const conf = await this.getConf()
    if (conf.autoDelTimeAway === 0 && conf.autoDelCountAway === 0) return
    let id_offset: number | undefined = undefined
    if (conf.autoDelCountAway)
      id_offset = (
        await prisma.event.findFirst({
          select: { id: true },
          skip: conf.autoDelCountAway,
          orderBy: { id: 'asc' },
        })
      )?.id
    const orConditions = [
      id_offset !== undefined && conf.autoDelCountAway
        ? {
            id: { lte: id_offset },
          }
        : undefined,
      conf.autoDelTimeAway
        ? {
            ctime: {
              lt: new Date(Date.now() - conf.autoDelTimeAway * 1000),
            },
          }
        : undefined,
    ].filter(
      (condition): condition is NonNullable<typeof condition> =>
        condition !== undefined,
    )
    if (!orConditions.length) return
    const del = await prisma.event.deleteMany({
      where: {
        OR: orConditions,
      },
    })
    if (del.count)
      await this.info(
        '日志管理',
        `清理旧日志 - autoDelTimeAway: ${conf.autoDelTimeAway}, autoDelCountAway: ${conf.autoDelCountAway}`,
        `成功清理${del.count}条事件`,
      )
  }
  static async clearEvents() {
    await prisma.event.deleteMany({})
  }
}
