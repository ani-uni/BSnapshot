import { defineHandler } from 'nitro/h3'
import { bigint2string } from '~/server/utils/bigint'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async () => {
  const captures = await Capture.list()
  return bigint2string(captures)
})
