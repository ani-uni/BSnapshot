import { HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { KVAuth } from '~s/types/kv/auth'
import type { TaskPayload } from '~s/types/tasks/payload'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string } from '~s/utils/bigint'
import { url2key } from '~s/utils/bili/auth/global/wbi'
import { Buvid } from '~s/utils/bili/auth/user/buvid'
import { getBiliTicket } from '~s/utils/bili/auth/user/ticket'
import { Cookies } from '~s/utils/cookies'
import { prisma } from '~s/utils/prisma'
import { AuthUserGet } from './get'

export interface TaskAuthUserRefreshPayload {
  mid: bigint
}

export type TaskAuthUserRefreshResult = UserModel

export default defineTask<TaskResult<TaskAuthUserRefreshResult>>({
  meta: {
    name: 'auth:user:refresh',
    description: 'Refresh user auth',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserRefreshPayload> }) {
    if (!payload.mid) throw new HTTPError('Missing mid', { status: 400 })
    const result = await AuthUserRefresh({
      ...payload,
      mid: BigInt(payload.mid),
    })
    return bigint2string({ result })
  },
})

export async function AuthUserRefresh(
  payload: TaskAuthUserRefreshPayload,
): Promise<TaskAuthUserRefreshResult> {
  const user = await AuthUserGet(payload)

  const bauth_cookies = new Cookies(user.userModel.bauth_cookies)
  // SESSDATA
  const SESSDATA = bauth_cookies.getOrThrow('SESSDATA')
  if (!SESSDATA) {
    await prisma.user.delete({ where: { mid: BigInt(payload.mid) } })
    throw new HTTPError('User not logged in', { status: 500 })
  }
  // buvid
  const buvid3 = bauth_cookies.get('buvid3')
  const buvid4 = bauth_cookies.get('buvid4')
  if (!buvid3 || !buvid4) {
    const res = await Buvid(bauth_cookies)
    bauth_cookies.set('buvid3', res?.b_3)
    bauth_cookies.set('buvid4', res?.b_4)
  }
  // ticket
  const ticket = bauth_cookies.get('bili_ticket')
  if (!ticket) {
    const res = await getBiliTicket(bauth_cookies)
    bauth_cookies.set((CK) => {
      CK.parse(
        `bili_ticket=${res?.ticket}; Domain=.bilibili.com; Expires=${new Date(Date.now() + 259260000).toUTCString()}`,
      )
    })
    const auth = useStorage<KVAuth>('auth')
    auth.set('img_key', url2key(res?.nav.img))
    auth.set('sub_key', url2key(res?.nav.sub))
  }

  const updatedUser = await prisma.user.update({
    where: { mid: BigInt(payload.mid) },
    data: {
      bauth_cookies: bauth_cookies.toString(),
    },
  })
  return updatedUser
}
