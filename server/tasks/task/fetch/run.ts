import { defineTask } from 'nitro/task'
import { FetchTaskAsQueue } from '~s/utils/common/fetchtask'

export default defineTask({
  meta: {
    name: 'task:fetch:run',
    description: 'Run fetch tasks in queue',
  },
  async run() {
    await FetchTaskAsQueue.run()
    return { result: { success: true } }
  },
})
