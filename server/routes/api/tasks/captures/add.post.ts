import { defineHandler, HTTPError } from 'nitro/h3'
import type { BigintToString } from '~/server/utils/bigint'
import type { CaptureCreate } from '~/server/utils/common/capture'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async ({ req }) => {
  const payload = (await req.json()) as BigintToString<CaptureCreate>
  if (!payload.clips || !payload.cid) {
    throw new HTTPError('Missing required fields: clips and cid', {
      statusCode: 400,
    })
  }
  const data = await Capture.create({
    clips: payload.clips,
    cid: BigInt(payload.cid),
    pubdate: payload.pubdate,
    upMid: payload.upMid ? BigInt(payload.upMid) : undefined,
    taskTypes: payload.taskTypes,
  })
  return data.toJSON
})
