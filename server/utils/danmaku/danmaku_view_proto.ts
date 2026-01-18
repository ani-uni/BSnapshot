import { UniPool } from '@dan-uni/dan-any'
import qs from 'qs'
import type { User } from '../common/user'

const url = { view: 'https://api.bilibili.com/x/v2/dm/web/view' }

/**
 * 获取弹幕个人配置与互动弹幕及BAS（代码）弹幕专包（web端）
 * @param user 用户实例
 * @param oid 视频cid
 * @param pid 稿件avid（非必要）
 * @returns 包含互动弹幕的 UniPool 对象
 * @throws 参数验证失败或 API 请求错误时抛出异常
 */
export async function command_seg(user: User, oid: bigint, pid?: number) {
  if (oid <= 0) throw new Error('oid参数错误')
  if (pid && pid <= 0) throw new Error('pid参数错误')

  return user
    .kyInstance()
    .get(`${url.view}?${qs.stringify({ type: 1, oid, pid })}`)
    .then((res) => res.arrayBuffer())
    .then((buf) =>
      UniPool.fromBiliCommandGrpc(buf, { dedupe: false, dmid: false }),
    )
}
