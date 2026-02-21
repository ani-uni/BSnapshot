import { defineHandler } from 'nitro/h3'
import { Event } from '~s/utils/common/event'

export default defineHandler(async () => {
  await Event.clearEvents()
  return { success: true }
})
