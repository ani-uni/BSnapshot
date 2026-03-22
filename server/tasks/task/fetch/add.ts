import { defineTask } from 'nitro/task'
import { Capture } from '~s/utils/common/capture'
import { checkNetworkConnectivity } from '~s/utils/connectivity'

export default defineTask({
  meta: {
    name: 'task:fetch:add',
    description: 'Run all captures to add fetch tasks to queue automatically',
  },
  async run() {
    const net = await checkNetworkConnectivity()
    if (!net) return { result: { success: false } }
    await Capture.runAll()
    return { result: { success: true } }
  },
})
