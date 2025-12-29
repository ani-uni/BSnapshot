import { defineConfig } from 'nitro'

export default defineConfig({
  compatibilityDate: 'latest',
  serverDir: 'server',
  imports: false,
  experimental: {
    asyncContext: true,
    tasks: true,
    websocket: true,
  },
})
