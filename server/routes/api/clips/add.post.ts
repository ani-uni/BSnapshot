import { defineHandler, HTTPError } from 'nitro/h3'
import { ClipAdd, type TaskClipAddPayload } from '~/server/tasks/clip/add'
import type { BigintToString } from '~/server/utils/bigint'

export default defineHandler(async ({ req }) => {
  const payload = (await req.json()) as BigintToString<TaskClipAddPayload>
  if (!payload.clips || !payload.cid) {
    throw new HTTPError('Invalid payload', { statusCode: 400 })
  }
  const res = await ClipAdd({
    ...payload,
    cid: BigInt(payload.cid),
  }).catch((err: Error) => {
    throw new HTTPError('Failed to add task and clips', {
      statusCode: 500,
      cause: err,
    })
  })
  return res
})
