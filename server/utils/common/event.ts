import type { HTTPError } from 'nitro/h3'
import { prisma } from '../prisma'

export class Event {
  constructor(private src: string) {}
  static async info(src: string, msg: string, params: string = '') {
    await prisma.event.create({
      data: {
        msg: `[${src}] <${msg}> ${params}`,
      },
    })
  }
  static async error(src: string, msg: string, err: HTTPError) {
    await prisma.event.create({
      data: {
        msg: `[${src}] <${msg}> ${err.message}`,
      },
    })
    return err
  }
  async log(msg: string, params: string = '') {
    await Event.info(this.src, msg, params)
  }
  async err(msg: string, err: HTTPError) {
    return await Event.error(this.src, msg, err)
  }
}
