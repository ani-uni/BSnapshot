import { useStorage } from 'nitro/storage'
import { defineTask } from 'nitro/task'
import type { KVAuth, WbiKeys } from '~/server/types/kv/auth'

export type TaskAuthGlobalWbiKeyGetResult = WbiKeys

export default defineTask<TaskAuthGlobalWbiKeyGetResult>({
  meta: {
    name: 'auth:global:wbikey:get',
    description: 'Get WBI keys',
  },
  async run() {
    const result = await AuthGlobalWbiKeyGet()
    return { result }
  },
})

export async function AuthGlobalWbiKeyGet(): Promise<TaskAuthGlobalWbiKeyGetResult> {
  const storage = useStorage<KVAuth>('auth')
  const img_key = (await storage.get('img_key')) ?? null
  const sub_key = (await storage.get('sub_key')) ?? null
  const result = { img_key, sub_key }
  return result
}
