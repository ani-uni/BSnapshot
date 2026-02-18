import { defineHandler } from 'nitro/h3'
import { bigint2string } from '~/server/utils/bigint'
import { queueID2params } from '~/server/utils/req-limit/id-parser'
import getQueue from '~/server/utils/req-limit/p-queue'

export default defineHandler(async () => {
  const queue = await getQueue()
  const rts = [
    ...queue.FastQueue.runningTasks,
    ...queue.SlowQueue.runningTasks,
  ].map((q) => {
    if (q.id) {
      const params = queueID2params.safeDecode(q.id)
      return params
    } else return null
  })
  return bigint2string(rts)
})
