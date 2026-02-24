import { defineEventHandler, handleCors } from 'nitro/h3'

export default defineEventHandler((e) => {
  const corsRes = handleCors(e, {
    origin: '*',
    preflight: {
      statusCode: 204,
    },
    methods: '*',
  })
  if (corsRes !== false) {
    return corsRes
  }
  return
})
