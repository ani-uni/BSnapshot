import { defineHandler, readValidatedBody } from 'nitro/h3'
import { Event, eventConfSchema } from '~s/utils/common/event'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(event, eventConfSchema)
  const data = await Event.setConf(payload)
  return data
})
