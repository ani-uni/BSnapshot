import { defineHandler, getValidatedQuery } from 'nitro/h3'
import z from 'zod'
import { Event } from '~s/utils/common/event'

export default defineHandler(async (event) => {
  const query = await getValidatedQuery(
    event,
    z.object({
      after: z.int().nonnegative().optional(),
    }),
  )
  const events = await Event.listEvents(query.after)
  return { events }
})
