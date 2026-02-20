import { UniPool } from '@dan-uni/dan-any'
import { HTTPError } from 'nitro/h3'
import qs from 'qs'
import { Event } from '../common/event'
import type { User } from '../common/user'
import { queueID2params } from '../req-limit/id-parser'
import queue from '../req-limit/p-queue'

const url = { view: 'https://api.bilibili.com/x/v2/dm/web/view' }

/**
 * 获取弹幕个人配置与互动弹幕及BAS（代码）弹幕专包（web端）
 * @param user 用户实例
 * @param oid 视频cid
 * @param pid 稿件avid（非必要）
 * @returns 包含互动弹幕的 UniPool 对象
 * @throws 参数验证失败或 API 请求错误时抛出异常
 */
export async function command_seg(user: User, oid: bigint, pid?: bigint) {
  if (oid <= 0) throw new HTTPError('oid参数错误', { statusCode: 400 })
  if (pid && pid <= 0) throw new HTTPError('pid参数错误', { statusCode: 400 })

  const e = new Event(
    `请求 互动/UP主/命令/BAS/高级 弹幕 - oid: ${oid}, pid: ${pid}`,
  )
  await e.log('开始请求')

  return (await queue()).SlowQueue.add(
    async () =>
      user
        .kyInstance()
        .get(`${url.view}?${qs.stringify({ type: 1, oid, pid })}`)
        .then((res) => res.arrayBuffer())
        .then((buf) => {
          try {
            return UniPool.fromBiliCommandGrpc(buf, {
              dedupe: false,
              dmid: false,
            })
          } catch (err) {
            throw e.err(
              '解析失败',
              new HTTPError(Buffer.from(buf).toString(), {
                statusCode: 500,
                cause: err,
              }),
            )
          }
        })
        .then(async (pool) => {
          await e.log('获取成功', `弹幕数: ${pool.dans.length}`)
          return pool
        }),
    {
      priority: 103,
      id: queueID2params.encode({ type: 'command_seg', oid }),
    },
  )
}
