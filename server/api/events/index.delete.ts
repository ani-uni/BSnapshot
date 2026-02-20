import { defineHandler } from 'nitro/h3'
import { Event } from '~/server/utils/common/event'

export default defineHandler(async () => {
  await Event.clearEvents()
  return { success: true }
})
