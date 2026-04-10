import { defineHandler } from 'nitro/h3'
import { Capture } from '~s/utils/common/capture'

export default defineHandler(async () => {
  const captures = await Capture.list()
  return captures
})
