import { defineHandler, getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { bigint2string } from '~s/utils/bigint'
import { queueID2params } from '~s/utils/req-limit/id-parser'
import getQueue from '~s/utils/req-limit/p-queue'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({
      raw: z.stringbool().optional(),
    }),
  )
  const queue = await getQueue()
  const rts_raw = [
    ...queue.FastQueue.runningTasks,
    ...queue.SlowQueue.runningTasks,
  ]
  if (query.raw) return rts_raw
  const rts = rts_raw.map((q) => {
    if (q.id) {
      const params = queueID2params.safeDecode(q.id)
      return { ...q, params }
    } else return { ...q, params: null }
  })
  return bigint2string(rts)
})
