import { defineEventHandler, HTTPError } from 'nitro/h3'
import { ClipSchedule, type TaskClipSchedulePayload } from '~/server/tasks/clip/schedule'

export default defineEventHandler(async ({ req }) => {
  const payload = (await req.json()) as TaskClipSchedulePayload
  const result = await ClipSchedule(payload?.fetchTaskId).catch((err: Error) => {
    throw new HTTPError('Failed to schedule clip tasks', {
      statusCode: 500,
      cause: err,
    })
  })
  return {
    success: true,
    data: result,
  }
})
