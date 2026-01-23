import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import {
  ClipPreGen,
  type TaskClipPreGenPayload,
} from '~/server/tasks/clip/pregen'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async (event) => {
  const type = getRouterParam(event, 'type')
  const id_raw = getRouterParam(event, 'id')
  if (!type) {
    throw new HTTPError('Missing type', { statusCode: 400 })
  }
  if (!id_raw) {
    throw new HTTPError('Missing id', { statusCode: 400 })
  }
  // const id = type === 'bvid' ? id_raw : BigInt(id_raw)
  let payload: TaskClipPreGenPayload | undefined
  if (type === 'aid') {
    payload = { type: 'aid', id: BigInt(id_raw) }
  } else if (type === 'bvid') {
    payload = { type: 'bvid', id: id_raw }
  } else if (type === 'cid') {
    payload = { type: 'cid', id: BigInt(id_raw) }
  } else {
    throw new HTTPError('Invalid type', { statusCode: 400 })
  }
  if (!payload) {
    throw new HTTPError('Invalid payload', { statusCode: 400 })
  }
  const res = await ClipPreGen(payload).catch((err: Error) => {
    throw new HTTPError(`Failed to pre-gen clip for ${type}:"${id_raw}"`, {
      statusCode: 500,
      cause: err,
    })
  })
  return bigint2string(res)
})
