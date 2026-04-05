/**
 * 导出两个队列，分别用于需要立即返回结果(api)和任务(task)的请求限流
 */

import PQueue from 'p-queue'

import { FetchTaskAsQueue } from '../common/fetchtask'

interface QueueInstance {
  FastQueue: PQueue
  SlowQueue: PQueue
}

let queueInstance: QueueInstance | null = null
let initPromise: Promise<QueueInstance> | null = null

async function initQueue(): Promise<QueueInstance> {
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
}

export default async function getQueue(): Promise<QueueInstance> {
  // 如果已成功初始化，直接返回缓存的实例
  if (queueInstance) {
    return queueInstance
  }

  // 如果正在初始化，等待同一个 Promise
  if (initPromise) {
    return initPromise
  }

  // 开始新的初始化
  initPromise = initQueue()

  try {
    queueInstance = await initPromise
    return queueInstance
  } catch (error) {
    // 初始化失败，清空 initPromise 允许重试
    initPromise = null
    throw error
  }
}
