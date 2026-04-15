import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import { TaskPreGen, TaskTaskPreGenPayloadSchema } from '~s/tasks/task/pregen'
import { bigint2string } from '~s/utils/bigint'

export default defineHandler(async (event) => {
  const payload = await getValidatedRouterParams(
    event,
    TaskTaskPreGenPayloadSchema,
  )
  const res = await TaskPreGen(payload)
  return bigint2string(res)
})
