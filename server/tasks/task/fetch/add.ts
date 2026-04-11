import { defineTask } from 'nitro/task'
import { Capture } from '~s/utils/common/capture'
import { User } from '~s/utils/common/user'
import { checkNetworkConnectivity } from '~s/utils/connectivity'

export default defineTask({
  meta: {
    name: 'task:fetch:add',
    description: 'Run all captures to add fetch tasks to queue automatically',
  },
  async run() {
    if (!(await User.exist())) return { result: { success: false } }
    const net = await checkNetworkConnectivity()
    if (!net) return { result: { success: false } }
    await Capture.runAll()
    return { result: { success: true } }
  },
})
