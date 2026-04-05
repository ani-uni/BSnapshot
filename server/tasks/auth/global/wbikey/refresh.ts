import { HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import type { KVAuth, WbiKeys } from '~s/types/kv/auth'
import type { TaskPayload } from '~s/types/tasks/payload'
import { getWbiKeys } from '~s/utils/bili/auth/global/wbi'
import { Event } from '~s/utils/common/event'
import { checkNetworkConnectivity } from '~s/utils/connectivity'
import { Cookies } from '~s/utils/cookies'

import { AuthGlobalWbiKeyGet } from './get'

export interface TaskAuthGlobalWbikeyRefreshPayload {
  bauth_cookies?: string
}

export type TaskAuthGlobalWbikeyRefreshResult = WbiKeys

export default defineTask<TaskAuthGlobalWbikeyRefreshResult>({
  meta: {
    name: 'auth:global:wbikey:refresh',
    description: 'Refresh WBI keys',
  },
  async run({
    payload,
  }: {
    payload: TaskPayload<TaskAuthGlobalWbikeyRefreshPayload>
  }) {
    const res = await AuthGlobalWbiKeyRefresh(payload)
    return { result: res }
  },
})

export async function AuthGlobalWbiKeyRefresh(
  payload?: TaskAuthGlobalWbikeyRefreshPayload,
): Promise<TaskAuthGlobalWbikeyRefreshResult> {
  const e = new Event('auth:global:wbikey:refresh')
  const net = await checkNetworkConnectivity()
  if (!net) {
    throw e.err(
      'WBI刷新失败',
      new HTTPError('Network is not connected', { status: 503 }),
    )
  }
  const storage = useStorage<KVAuth>('auth')
  const res = await getWbiKeys(
    payload ? new Cookies(payload.bauth_cookies) : undefined,
  )
  if (!res)
    throw e.err(
      'WBI刷新失败',
      new HTTPError('Failed to refresh WBI keys', { status: 500 }),
    )
  const original = await AuthGlobalWbiKeyGet()
  if (res.img_key === original.img_key) {
    storage.set('img_key', res.img_key)
    e.log('img_key', '刷新成功')
  }
  if (res.sub_key === original.sub_key) {
    storage.set('sub_key', res.sub_key)
    e.log('sub_key', '刷新成功')
  }
  return res
}
