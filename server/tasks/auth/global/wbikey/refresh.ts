import { HTTPError } from 'nitro/h3'
import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import type { KVAuth, WbiKeys } from '~/server/types/kv/auth'
import type { TaskPayload } from '~/server/types/tasks/payload'
import { getWbiKeys } from '~/server/utils/auth/global/wbi'
import { Cookies } from '~/server/utils/cookies'

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
  const storage = useStorage<KVAuth>('auth')
  const res =
    (await getWbiKeys(
      payload ? new Cookies(payload.bauth_cookies) : undefined,
    )) ?? undefined
  storage.set('img_key', res?.img_key ?? null)
  storage.set('sub_key', res?.sub_key ?? null)
  if (!res)
    throw new HTTPError('Failed to refresh WBI keys', { statusCode: 500 })
  return res
}
