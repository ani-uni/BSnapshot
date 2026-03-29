import { defineConfig } from 'nitro'

export default defineConfig({
  compatibilityDate: 'latest',
  serverDir: 'server',
  imports: false,
  experimental: {
    openAPI: false,
    typescriptBundlerResolution: true,
    asyncContext: true,
    envExpansion: true,
    tasks: true,
  },
  features: {
    websocket: true,
  },
  future: {
    nativeSWR: true,
  },
  oxc: {
    minify: { compress: true, mangle: true },
  },
  openAPI: {
    meta: {
      title: 'BSnapshot API',
      description: 'API documentation for BSnapshot',
      version: '1.0.0',
    },
    production: 'prerender',
  },
  storage: {
    base: { driver: 'fs', base: '.data/db/base' },
    auth: { driver: 'fs', base: '.data/db/auth' },
    tmdb: { driver: 'fs', base: '.data/db/tmdb' },
    cache: { driver: 'lru-cache' }, // nitro内置缓存
  },
  scheduledTasks: {
    '0 12 * * *': ['auth:user:check'],
    '0 */2 * * *': ['auth:global:wbikey:refresh'],
    '*/2 * * * *': ['task:fetch:add'],
    '*/1 * * * *': ['task:fetch:run'],
  },
})
