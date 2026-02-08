import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { bigint2string } from '~/server/utils/bigint'
import { Clip } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
  const cid_raw = getRouterParam(event, 'cid')
  if (!cid_raw) {
    throw new HTTPError('Missing cid', { statusCode: 400 })
  }
  const clips = await Clip.listInfoFromCID(BigInt(cid_raw))
  return bigint2string(clips)
})
