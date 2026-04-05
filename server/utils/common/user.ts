import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import { AuthGlobalWbiKeyGet } from '~s/tasks/auth/global/wbikey/get'

import type { UserModel } from '~/generated/prisma/models'

import { encWbi } from '../bili/auth/global/wbi'
import { Cookies } from '../cookies'
import { prisma } from '../prisma'
import { Event } from './event'

export type UserWithoutDetails = Omit<UserModel, 'bauth_cookies'>

const e = new Event('utils:common:user')

export class User {
  constructor(public userModel: UserModel) {}
  static async load(userModel: UserModel) {
    if (!userModel.bauth_cookies) {
      await prisma.user.delete({ where: { mid: userModel.mid } })
      throw e.err(
        'load',
        new HTTPError('User is not logged in', { status: 500 }),
      )
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
        throw e.err(
          'fromMid',
          new HTTPError(`User with mid ${mid.toString()} not found`, {
            status: 404,
            cause: err,
          }),
        )
      })
    return User.load(u)
  }
  static async fromRandom() {
    const count = await prisma.user.count()
    if (count === 0)
      throw e.err(
        'fromRandom',
        new HTTPError('No available users, please login at least one user', {
          status: 500,
        }),
      )
    const skip = Math.floor(Math.random() * count)
    const u = await prisma.user
      .findFirstOrThrow({
        orderBy: { mid: 'asc' },
        skip,
        take: 1,
      })
      .catch((err: Error) => {
        throw e.err(
          'fromRandom',
          new HTTPError('Failed to get random user', {
            status: 500,
            cause: err,
          }),
        )
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
    const update = async (mid: bigint) =>
      await prisma.runtime.upsert({
        where: { id: 0 },
        update: { lastUserMid: mid },
        create: { id: 0, lastUserMid: mid },
      })
    for (let i = 0; i < 3; i++) {
      const u = await User.fromRandom()
      if (u.userModel.mid !== (lastMid ?? 0n)) {
        await update(u.userModel.mid)
        return u
      }
    }
    const alt = await prisma.user.findFirst({
      where: lastMid ? { mid: { not: lastMid } } : undefined,
      orderBy: { mid: 'asc' },
    })
    const use = await (alt ? User.fromMid(alt.mid) : User.fromRandom())
    await update(use.userModel.mid)
    return use
  }
  toJSON() {
    return { ...this.userModel, mid: this.userModel.mid.toString() }
  }
  kyInstance() {
    const ck = new Cookies(this.userModel.bauth_cookies)
    return ky.create({
      headers: ck.toHeaders('bili_web'),
    })
  }
  async encWbi(params: Record<string, unknown>) {
    const wbiKey = await AuthGlobalWbiKeyGet()
    if (!wbiKey.img_key || !wbiKey.sub_key)
      throw e.err(
        'encWbi',
        new HTTPError('WBI key is not available', { status: 500 }),
      )
    return encWbi(params, wbiKey.img_key, wbiKey.sub_key)
  }
}
