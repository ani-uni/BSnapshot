import { definePlugin } from 'nitro'
import { useStorage } from 'nitro/storage'
import path from 'path'
import fsDriver from 'unstorage/drivers/fs'

export default definePlugin(async () => {
  const storage = useStorage()
  if (process.env.KV_PATH) {
    await storage.unmount('auth')
    await storage.unmount('tmdb')
    storage.mount(
      'auth',
      fsDriver({ base: path.resolve(process.env.KV_PATH, 'auth') }),
    )
    storage.mount(
      'tmdb',
      fsDriver({ base: path.resolve(process.env.KV_PATH, 'tmdb') }),
    )
  }
})
