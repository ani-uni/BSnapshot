import { defineTask } from 'nitro/task'
import { FetchTaskAsQueue } from '~s/utils/common/fetchtask'
import { checkNetworkConnectivity } from '~s/utils/connectivity'

export default defineTask({
  meta: {
    name: 'task:fetch:run',
    description: 'Run fetch tasks in queue',
  },
  async run() {
    const net = await checkNetworkConnectivity()
    if (!net) return { result: { success: false } }
    await FetchTaskAsQueue.run()
    return { result: { success: true } }
  },
})
