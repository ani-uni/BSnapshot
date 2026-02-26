import { defineHandler } from 'nitro/h3'

export default defineHandler((event) => {
  event.res.status = 204
  return
})
