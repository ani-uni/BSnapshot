import { HTTPError } from 'nitro/h3'
import { TaskStatus, TaskType } from '~/generated/prisma/enums'
import type {
  CaptureModel,
  ConfigModel,
  FetchTaskCreateManyInput,
  FetchTaskModel,
  RuntimeModel,
} from '~/generated/prisma/models'
import { ConfigGet } from '~s/tasks/config/get'
import { his, rt, sp, up } from '../bili/danmaku/main'
import { prisma } from '../prisma'
import { Capture } from './capture'
import { User } from './user'

export class FetchTask {
  constructor(public fetchTaskModel: FetchTaskModel) {}
  /**
   * @deprecated 由方法 Capture.createCaptureTasks 替代
   */
  static async createFromCapture(
    capture: CaptureModel,
    type?: FetchTaskModel['type'][],
  ) {
    if (!type) type = ['RT', 'HIS', 'SP']
    const cid = capture.cid
    if (capture.upMid && type.includes('UP')) {
      if (!User.fromMid(capture.upMid)) {
        type = type.filter((t) => t !== 'UP')
        // 当然，这毫无意义，因为如果找不到User会直接报错
      }
    }
    const tasks = []
    for (const t of type) {
      tasks.push({
        cid,
        type: t,
        status: TaskStatus.PENDING,
        lastRunAt: new Date(0),
      } satisfies FetchTaskCreateManyInput)
    }
    await prisma.fetchTask.createMany({ data: tasks })
    return tasks
  }
  // 类似上面的方法，若存在则切换状态(disabled/pending)，不存在则创建
  static async createOrToggleFromCapture(
    capture: CaptureModel,
    type: FetchTaskModel['type'][] = [TaskType.RT, TaskType.HIS, TaskType.SP],
  ) {
    if (capture.upMid && type.includes('UP')) {
      if (!User.fromMid(capture.upMid)) {
        type = type.filter((t) => t !== 'UP')
        // 当然，这毫无意义，因为如果找不到User会直接报错
      }
    }
    await prisma.$transaction(async (tx) => {
      for (const t of type) {
        const ft = await tx.fetchTask.findUnique({
          where: {
            cid_type: {
              cid: capture.cid,
              type: t,
            },
          },
        })
        if (ft) {
          if (ft.status === TaskStatus.DISABLED) {
            await tx.fetchTask.update({
              where: { id: ft.id },
              data: { status: TaskStatus.PENDING },
            })
          } else {
            await tx.fetchTask.update({
              where: { id: ft.id },
              data: {
                status: TaskStatus.DISABLED,
                queueId: null,
                lastRunAt:
                  ft.status === TaskStatus.RUNNING ? new Date() : ft.lastRunAt,
              },
            })
          }
        } else {
          await tx.fetchTask.create({
            data: {
              cid: capture.cid,
              type: t,
              status: TaskStatus.PENDING,
              lastRunAt: new Date(0),
            },
          })
        }
      }
    })
  }
  static async listFromCID(cid: bigint) {
    const fetchTasks = await prisma.fetchTask.findMany({
      where: { cid },
    })
    return fetchTasks.map((ft) => new FetchTask(ft))
  }
  // 由task每30min检测一次距离lastRunAt是否过了interval来调用下方FetchTaskAsQueue.add()来添加qid
  async run(manual = false) {
    // 已由下方add在isIdle中检测是否达到指定时间间隔和批次限制
    const qid = await new FetchTaskAsQueue().add(this, manual)
    return qid
  }
  /**
   * @deprecated 不应在上级单位存在时删除，应使用上方toggle方法禁用代替(软删除)
   */
  async del() {
    await prisma.fetchTask.delete({
      where: { id: this.fetchTaskModel.id },
    })
  }
  /**
   * 不应在上方手动切换中被使用，仅运行时使用
   */
  async status(type: TaskStatus, manual = false) {
    // 防止disable后被完成的任务覆盖状态
    if (type === TaskStatus.RUNNING && manual === false)
      await prisma.fetchTask.update({
        where: { id: this.fetchTaskModel.id },
        data: { status: type },
      })
  }
  async afterRun() {
    await prisma.fetchTask.update({
      where: { id: this.fetchTaskModel.id },
      data: {
        lastRunAt: new Date(),
        queueId: null,
      },
    })
  }
  get toJSON() {
    return { ...this.fetchTaskModel, cid: this.fetchTaskModel.cid.toString() }
  }
}

export class FetchTaskAsQueue {
  public conf: ConfigModel = {
    id: 0,
    reqIntervalSec: 10,
    reqBatch: 20,
    rtIntervalSec: 7200,
    rtBatch: 10,
    hisIntervalSec: 1800,
    hisBatch: 5,
    spIntervalSec: 86400,
    spBatch: 5,
    upIntervalSec: 7200,
    upBatch: 5,
    upPool: 500,
  }
  public runtime: RuntimeModel = {
    id: 0,
    lastUserMid: 0n,
    // fetchTaskQueueIdle: true,
  }
  async init() {
    const conf = await ConfigGet()
    this.conf = conf.conf
    this.runtime = conf.runtime
  }
  async isIdle(ft?: FetchTask) {
    const total =
      (await prisma.fetchTask.count({
        where: { status: TaskStatus.RUNNING },
      })) < this.conf.reqBatch
    if (total === false) return false
    else {
      // total === true
      if (ft) {
        let intervalSec = 0
        let batch = 0
        if (ft.fetchTaskModel.type === TaskType.RT) {
          intervalSec = this.conf.rtIntervalSec
          batch = this.conf.rtBatch
        } else if (ft.fetchTaskModel.type === TaskType.HIS) {
          intervalSec = this.conf.hisIntervalSec
          batch = this.conf.hisBatch
        } else if (ft.fetchTaskModel.type === TaskType.SP) {
          intervalSec = this.conf.spIntervalSec
          batch = this.conf.spBatch
        } else if (ft.fetchTaskModel.type === TaskType.UP) {
          intervalSec = this.conf.upIntervalSec
          batch = this.conf.upBatch
        } else
          throw new HTTPError('Unknown task type in isIdle', {
            statusCode: 500,
          })
        const subInterval =
          Date.now() >=
          ft.fetchTaskModel.lastRunAt.getTime() + intervalSec * 1000
        const subBatch =
          (await prisma.fetchTask.count({
            where: {
              status: TaskStatus.RUNNING,
              type: ft.fetchTaskModel.type,
            },
          })) < batch
        return subInterval && subBatch
      }
      return true
    }
  }
  // 每分钟在task里被调用，但只要当前还有任务在执行，就始终采用第一个实例
  // 添加id时，手动触发直接排id=0~999,其它任务从1000开始排序
  async getNextQID(type: TaskType, manual = false) {
    const minQID = manual ? 0 : 1000
    const maxQID = manual ? 999 : undefined
    const lastTask = await prisma.fetchTask.findFirst({
      where: {
        type,
        queueId: {
          not: null,
          gte: minQID,
          lte: maxQID,
        },
      },
      orderBy: { queueId: 'desc' },
      select: { queueId: true },
    })
    if (lastTask) {
      if (lastTask.queueId === null)
        throw new HTTPError('Unexpected null queueId', { statusCode: 500 })
      return lastTask.queueId + 1
    }
    return minQID
  }
  async add(
    ft: FetchTask,
    /**
     * 是否为手动触发，若是则置于最前一个
     */
    manual = false,
  ) {
    // pending状态正常加入
    // failed可能是错误重试
    // done只有手动状态下才能加入
    if (ft.fetchTaskModel.status === TaskStatus.DISABLED)
      throw new HTTPError('Cannot add DISABLED task to queue', {
        statusCode: 400,
      })
    if (ft.fetchTaskModel.status === TaskStatus.RUNNING) return null
    else if (
      ft.fetchTaskModel.status !== TaskStatus.PENDING &&
      manual === false
    )
      throw new HTTPError(
        'Cannot add DONE/FAILED task to queue automatically',
        {
          statusCode: 400,
        },
      )
    if (manual === false && !(await this.isIdle(ft))) return null
    const qid = await this.getNextQID(ft.fetchTaskModel.type, manual)
    await prisma.fetchTask.update({
      where: { id: ft.fetchTaskModel.id },
      data: { queueId: qid, status: TaskStatus.RUNNING },
    })
    return qid
  }
  // 按照Type+queueID优先顺序执行，每个type都从0开始排id
  // type 优先级 RT > UP > SP > HIS
  // 无论如何，手动安排的任务优先级都高于自动任务(id<1000)
  static async run() {
    const priority = [TaskType.RT, TaskType.UP, TaskType.SP, TaskType.HIS]
    const findNext = async (
      minQID: number,
      maxQID?: number,
    ): Promise<(FetchTaskModel & { capture: CaptureModel })[]> => {
      for (const type of priority) {
        const task = await prisma.fetchTask.findMany({
          where: {
            status: TaskStatus.RUNNING,
            type,
            queueId: { not: null, gte: minQID, lte: maxQID },
          },
          orderBy: { queueId: 'asc' },
          include: { capture: true },
        })
        if (task.length > 0) return task
      }
      return []
    }
    const manual = await findNext(0, 999)
    const auto = await findNext(1000)
    const taskToRun = [...manual, ...auto]
    // // 前面获取的时候应该就是排好序的了
    // .toSorted((a, b) => {
    //   if (a.queueId === null || b.queueId === null)
    //     throw new HTTPError('Unexpected null queueId in run', {
    //       statusCode: 500,
    //     })
    //   return a.queueId - b.queueId
    // })
    const fetchConstructor = (
      task: FetchTaskModel & { capture: CaptureModel },
    ) => {
      const ft = new FetchTask(task)
      const capture = new Capture(task.capture)
      if (task.type === TaskType.RT) {
        return async () => {
          const pool = await rt(
            await User.fromRotating(),
            task.cid,
            task.capture.segs.split(',').map(Number),
          ).catch(async (err) => {
            await ft.status(TaskStatus.FAILED)
            await ft.afterRun()
            throw new HTTPError('Failed to fetch RT danmaku', {
              statusCode: 500,
              cause: err,
            })
          })
          if (pool.dans.length === 0) {
            // 获取实时弹幕若弹幕数为0,则：
            // 1. 新视频，还没人发 (至少等有一个人发过弹幕再抓把)
            // 2. 视频被删，获取失败
            // 对于这两种情况，都不继续处理，直接标记为失败
            await ft.status(TaskStatus.FAILED)
            await ft.afterRun()
            throw new HTTPError('No danmaku fetched in RT task', {
              statusCode: 500,
            })
          }
          await capture.mergeDanmaku(pool)
          await ft.status(TaskStatus.PENDING)
          await ft.afterRun()
          return
        }
      } else if (task.type === TaskType.HIS) {
        return async () => {
          const toFetchDates = await capture.getHisDates(1)
          // 当没有需要获取的日期时，说明历史弹幕已经获取完毕
          if (toFetchDates.length === 0) {
            await ft.status(TaskStatus.DONE)
            await ft.afterRun()
            return
          }
          // 当尝试获取的某天不存在时，his会返回空UniPool
          const pool = await his(
            await User.fromRotating(),
            task.cid,
            toFetchDates,
          ).catch(async (err) => {
            await ft.status(TaskStatus.FAILED)
            await ft.afterRun()
            throw new HTTPError('Failed to fetch HIS danmaku', {
              statusCode: 500,
              cause: err,
            })
          })
          // 已经确保merge时的所有状态处理均完成
          await capture.mergeDanmaku(pool)
          await ft.status(TaskStatus.PENDING)
          await ft.afterRun()
          return
        }
      } else if (task.type === TaskType.SP) {
        return async () => {
          const pool = await sp(await User.fromRotating(), task.cid).catch(
            async (err) => {
              await ft.status(TaskStatus.FAILED)
              await ft.afterRun()
              throw new HTTPError('Failed to fetch SP danmaku', {
                statusCode: 500,
                cause: err,
              })
            },
          )
          if (pool.dans.length === 0) {
            // 原因同rt
            await ft.status(TaskStatus.FAILED)
            await ft.afterRun()
            throw new HTTPError('No danmaku fetched in SP task', {
              statusCode: 500,
            })
          }
          await capture.mergeDanmaku(pool)
          await ft.status(TaskStatus.PENDING)
          await ft.afterRun()
          return
        }
      } else if (task.type === TaskType.UP) {
        return async () => {
          // 当然，add之前本来就有检查的
          if (!task.capture.upMid)
            throw new HTTPError('UP task should not run without upMid', {
              statusCode: 500,
            })
          const cursor = capture.upLatest
          const conf = new FetchTaskAsQueue()
          await conf.init()
          const pool = await up(
            await User.fromMid(task.capture.upMid),
            task.cid,
            cursor,
            conf.conf.upPool,
          ).catch(async (err) => {
            await ft.status(TaskStatus.FAILED)
            await ft.afterRun()
            throw new HTTPError('Failed to fetch UP danmaku', {
              statusCode: 500,
              cause: err,
            })
          })
          if (pool.dans.length === 0) {
            // 可能是到目前为止所有弹幕已获取完毕，故视为完成
            await ft.status(TaskStatus.DONE)
            await ft.afterRun()
            return
          }
          await capture.mergeDanmaku(pool, true)
          await ft.status(TaskStatus.PENDING)
          await ft.afterRun()
          return
        }
      }
      // 已遍历所有种类的任务，正常情况不会报错
      throw new HTTPError('Unknown task type', { statusCode: 500 })
    }
    const fetchers = taskToRun.map(fetchConstructor)
    for (const f of fetchers) {
      await f()
    }
  }
}
