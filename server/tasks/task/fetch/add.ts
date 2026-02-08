import { defineTask } from 'nitro/task'
import { Capture } from '~/server/utils/common/capture'

export default defineTask({
  meta: {
    name: 'task:fetch:add',
    description: 'Run all captures to add fetch tasks to queue automatically',
  },
  async run() {
    await Capture.runAll()
    return { result: { success: true } }
  },
})
