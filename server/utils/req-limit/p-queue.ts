/**
 * 导出两个队列，分别用于需要立即返回结果(api)和任务(task)的请求限流
 */

import PQueue from 'p-queue'
import { FetchTaskAsQueue } from '../common/fetchtask'

const queue = (async () => {
  const c = new FetchTaskAsQueue()
  await c.init()

  // 默认10秒跑10个请求
  const FastQueue = new PQueue({
    concurrency: 2,
    intervalCap: 10,
    interval: 10 * 1000,
  })
  // 每 间隔 个时间 跑 1 个请求
  const SlowQueue = new PQueue({
    concurrency: 1,
    intervalCap: 1,
    interval: c.conf.reqIntervalSec * 1000,
  })

  return { FastQueue, SlowQueue }
})()

export default queue
