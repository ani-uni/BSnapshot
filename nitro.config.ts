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
  },
  scheduledTasks: {
    '0 12 * * *': ['auth:user:check'],
    '0 */2 * * *': ['auth:global:wbikey:refresh'],
    '*/5 * * * *': ['task:fetch:add'], // 每5分钟扫描并调度任务
    '*/10 * * * *': ['task:fetch:run'], // 每10分钟执行任务队列
  },
})
