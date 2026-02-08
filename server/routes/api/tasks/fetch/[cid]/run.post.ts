import { defineHandler, getRouterParam, HTTPError, readBody } from 'nitro/h3'
import type { TaskType } from '~/generated/prisma/enums'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const cid_raw = getRouterParam(event, 'cid')
  if (!cid_raw) {
    throw new HTTPError('Missing cid', { statusCode: 400 })
  }
  const payload = (await readBody(event).catch(() => {
    throw new HTTPError('Missing payload', { statusCode: 400 })
  })) as { types?: TaskType[]; manual?: boolean }
  const capture = await Capture.loadFromCID(BigInt(cid_raw))
  await capture.run(payload?.types, payload?.manual ?? false)
  return { success: true }
})
