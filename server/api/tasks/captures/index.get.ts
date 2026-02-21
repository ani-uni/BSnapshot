import { defineHandler } from 'nitro/h3'
import { bigint2string } from '~s/utils/bigint'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async () => {
  const captures = await Capture.list()
  return bigint2string(captures)
})
