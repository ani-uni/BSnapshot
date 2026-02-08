import { defineHandler, getValidatedRouterParams, HTTPError } from 'nitro/h3'
import z from 'zod'
import {
  TaskPreGen,
  type TaskTaskPreGenPayload,
} from '~/server/tasks/task/pregen'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async (event) => {
  const payload_raw = await getValidatedRouterParams(
    event,
    z.object({
      type: z.enum(['aid', 'bvid', 'cid']),
      id: z.string(),
    }),
  )
  // const id = type === 'bvid' ? id_raw : BigInt(id_raw)
  let payload: TaskTaskPreGenPayload | undefined
  if (payload_raw.type === 'aid') {
    payload = { type: 'aid', id: BigInt(payload_raw.id) }
  } else if (payload_raw.type === 'bvid') {
    payload = { type: 'bvid', id: payload_raw.id }
  } else if (payload_raw.type === 'cid') {
    payload = { type: 'cid', id: BigInt(payload_raw.id) }
  } else {
    throw new HTTPError('Invalid type', { statusCode: 400 })
  }
  if (!payload) {
    throw new HTTPError('Invalid payload', { statusCode: 400 })
  }
  const res = await TaskPreGen(payload)
  return bigint2string(res)
})
