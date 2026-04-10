import { useStorage } from 'nitro/storage'
import z from 'zod'

import { EventLevel } from '~/generated/prisma/enums'

import { prisma } from '../prisma'

export const eventConfSchema = z.object({
  autoDelTimeAway: z.int().nonnegative(), // 自动清理n秒前的事件，0为不自动清理
})
export type EventConf = z.infer<typeof eventConfSchema>

export class Event {
  constructor(private src: string) {}
  static async getConf(): Promise<EventConf> {
    const storage = useStorage('event')
    return {
      autoDelTimeAway:
        (await storage.getItem<EventConf['autoDelTimeAway']>(
          'autoDelTimeAway',
        )) ?? 7 * 24 * 3600, // 默认7天
    }
  }
  static async setConf(conf: EventConf) {
    const storage = useStorage('event')
    await storage.setItem('autoDelTimeAway', conf.autoDelTimeAway)
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
    await prisma.event.deleteMany({
      where: {
        ctime: {
          lt: new Date(Date.now() - conf.autoDelTimeAway * 1000),
        },
      },
    })
  }
  static async clearEvents() {
    await prisma.event.deleteMany({})
  }
}
