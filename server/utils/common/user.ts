import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import type { UserModel } from '~/generated/prisma/models'
import { Cookies } from '../cookies'
import { prisma } from '../prisma'

export class User {
  constructor(public userModel: UserModel) {}
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
    return new User(u)
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
    return new User(u)
  }
  kyInstance() {
    const ck = new Cookies(this.userModel.bauth_cookies)
    return ky.create({
      headers: ck.toHeaders(),
    })
  }
}
