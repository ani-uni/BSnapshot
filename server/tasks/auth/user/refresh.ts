import { HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import type { UserModel } from '~/generated/prisma/models'
import type { KVAuth } from '~/server/types/kv/auth'
import type { TaskPayload } from '~/server/types/tasks/payload'
import { url2key } from '~/server/utils/auth/global/wbi'
import { Buvid } from '~/server/utils/auth/user/buvid'
import { getBiliTicket } from '~/server/utils/auth/user/ticket'
import { Cookies } from '~/server/utils/cookies'
import { prisma } from '~/server/utils/prisma'
import { AuthUserGet } from './get'

export interface TaskAuthUserRefreshPayload {
  mid: string // bigint
}

export type TaskAuthUserRefreshResult = Omit<UserModel, 'mid'> & { mid: string }

export default defineTask<TaskAuthUserRefreshResult>({
  meta: {
    name: 'auth:user:refresh',
    description: 'Refresh user auth',
  },
  async run({ payload }: { payload: TaskPayload<TaskAuthUserRefreshPayload> }) {
    if (!payload.mid) throw new HTTPError('Missing mid', { statusCode: 400 })
    const result = await AuthUserRefresh(payload as TaskAuthUserRefreshPayload)
    return { result }
  },
})

export async function AuthUserRefresh(
  payload: TaskAuthUserRefreshPayload,
): Promise<TaskAuthUserRefreshResult> {
  const user = await AuthUserGet(payload)

  const bauth_cookies = new Cookies(user.bauth_cookies)
  // SESSDATA
  const SESSDATA = bauth_cookies.getOrThrow('SESSDATA')
  if (!SESSDATA) {
    await prisma.user.delete({ where: { mid: BigInt(payload.mid) } })
    throw new HTTPError('User not logged in', { statusCode: 500 })
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
  const result = { ...updatedUser, mid: updatedUser.mid.toString() }
  return result
}
