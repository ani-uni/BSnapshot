import { defineHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import { ClipDel, type TaskClipDelPayload } from '~/server/tasks/clip/del'

export default defineHandler(async (event) => {
  const cid_raw = getRouterParam(event, 'cid')
  if (!cid_raw) {
    throw new HTTPError('Missing cid', { statusCode: 400 })
  }
  const body = (await readBody(event).catch(() => {
    throw new HTTPError('Missing payload', { statusCode: 400 })
  })) as Partial<TaskClipDelPayload>

  const res = await ClipDel({
    ...body,
    cid: BigInt(cid_raw),
  }).catch((err: Error) => {
    throw new HTTPError(
      `Failed to delete task and clips with cid:"${cid_raw}"`,
      {
        statusCode: 500,
        cause: err,
      },
    )
  })
  return res
})
