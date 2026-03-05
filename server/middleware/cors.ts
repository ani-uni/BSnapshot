import { defineHandler, handleCors } from 'nitro/h3'

export default defineHandler((e) => {
  const corsRes = handleCors(e, {
    origin: '*',
    preflight: {
      status: 204,
    },
    methods: '*',
  })
  if (corsRes !== false) {
    return corsRes
  }
  return
})
