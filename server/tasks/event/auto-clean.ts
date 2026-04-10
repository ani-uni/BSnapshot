import { defineTask } from 'nitro/task'
import { Event } from '~s/utils/common/event'

export default defineTask({
  meta: {
    name: 'event:auto-clean',
    description: 'Automatically clean old events',
  },
  async run() {
    await Event.cleanEvents()
    return { result: { success: true } }
  },
})
