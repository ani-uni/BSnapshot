import { EventLevel } from '~/generated/prisma/enums'
import { prisma } from '../prisma'

export class Event {
  constructor(private src: string) {}
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
  static async clearEvents() {
    await prisma.event.deleteMany({})
  }
}
