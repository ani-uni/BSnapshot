import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import type { UserModel } from '~/generated/prisma/models'
import { AuthGlobalWbiKeyGet } from '~/server/tasks/auth/global/wbikey/get'
import { encWbi } from '../auth/global/wbi'
import { Cookies } from '../cookies'
import { prisma } from '../prisma'

export type UserWithoutDetails = Omit<UserModel, 'bauth_cookies'>

export class User {
  constructor(public userModel: UserModel) {}
  static async load(userModel: UserModel) {
    if (!userModel.bauth_cookies) {
      await prisma.user.delete({ where: { mid: userModel.mid } })
      throw new HTTPError('User is not logged in', { statusCode: 500 })
    }
    return new User(userModel)
  }
  static async list(): Promise<UserWithoutDetails[]> {
    const users = await prisma.user.findMany({ omit: { bauth_cookies: true } })
    return users
  }
  static async fromMid(mid: bigint) {
    const u = await prisma.user
      .findUniqueOrThrow({
        where: { mid },
      })
      .catch((err: Error) => {
        throw new HTTPError(`User with mid ${mid.toString()} not found`, {
          statusCode: 404,
          cause: err,
        })
      })
    return User.load(u)
  }
  static async fromRandom() {
    const count = await prisma.user.count()
    if (count === 0)
      throw new HTTPError(
        'No available users, please login at least one user',
        { statusCode: 500 },
      )
    const skip = Math.floor(Math.random() * count)
    const u = await prisma.user
      .findFirstOrThrow({
        orderBy: { mid: 'asc' },
        skip,
        take: 1,
      })
      .catch((err: Error) => {
        throw new HTTPError('Failed to get random user', {
          statusCode: 500,
          cause: err,
        })
      })
    return User.load(u)
  }
  // 选择一个与上次使用不同的用户，避免连续使用同一用户
  static async fromRotating(lastMid?: bigint | null) {
    if (!lastMid)
      lastMid =
        (
          await prisma.runtime
            .findUniqueOrThrow({
              where: { id: 0 },
            })
            .catch(() => null)
        )?.lastUserMid ?? null
    for (let i = 0; i < 3; i++) {
      const u = await User.fromRandom()
      if (u.userModel.mid !== (lastMid ?? 0n)) return u
    }
    const alt = await prisma.user.findFirst({
      where: lastMid ? { mid: { not: lastMid } } : undefined,
      orderBy: { mid: 'asc' },
    })
    const use = await (alt ? User.fromMid(alt.mid) : User.fromRandom())
    await prisma.runtime.upsert({
      where: { id: 0 },
      update: { lastUserMid: use.userModel.mid },
      create: { id: 0, lastUserMid: use.userModel.mid },
    })
    return use
  }
  get toJSON() {
    return this.userModel
  }
  kyInstance() {
    const ck = new Cookies(this.userModel.bauth_cookies)
    return ky.create({
      headers: ck.toHeaders(),
    })
  }
  async encWbi(params: Record<string, unknown>) {
    const wbiKey = await AuthGlobalWbiKeyGet()
    if (!wbiKey.img_key || !wbiKey.sub_key)
      throw new HTTPError('WBI key is not available', { statusCode: 500 })
    return encWbi(params, wbiKey.img_key, wbiKey.sub_key)
  }
}
