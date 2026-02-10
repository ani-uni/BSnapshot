import { defineHandler } from 'nitro/h3'
import { AuthGlobalWbiKeyGet } from '~/server/tasks/auth/global/wbikey/get'

export default defineHandler(async () => {
  const res = await AuthGlobalWbiKeyGet()
  return res
})
