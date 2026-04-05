import path from 'node:path'

import { definePlugin } from 'nitro'
import { useStorage } from 'nitro/storage'
import fsDriver from 'unstorage/drivers/fs'

export default definePlugin(async () => {
  const storage = useStorage()
  if (process.env.USER_DATA_PATH) {
    await storage.unmount('auth')
    await storage.unmount('tmdb')
    const base = path.resolve(process.env.USER_DATA_PATH, '.data/db')
    storage.mount('auth', fsDriver({ base: path.resolve(base, 'auth') }))
    storage.mount('tmdb', fsDriver({ base: path.resolve(base, 'tmdb') }))
  }
})
