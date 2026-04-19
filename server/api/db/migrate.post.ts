import { defineHandler } from 'nitro/h3'
import { migrateDB } from '~s/utils/db-migrate'

export default defineHandler(async () => {
  await migrateDB()
  return { success: true }
})
