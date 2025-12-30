import { defineWebSocketHandler, HTTPError } from 'nitro/h3'
import type { UserModel } from '~/generated/prisma/models'
import { AuthUserLoginQr } from '~/server/tasks/auth/user/login_qr'

export interface WSAuthUserLoginQrGenMessage {
  gen: {
    qrcode_key: string
    qrcode_url: string
  }
}

export interface WSAuthUserLoginQrPingMessage {
  ping: 'pong'
}

export interface WSAuthUserLoginQrUserMessage {
  user: Omit<UserModel, 'mid'> & {
    mid: string
  }
}

export interface WSAuthUserLoginQrMsgMessage {
  msg: string
}

export interface WSAuthUserLoginQrErrMessage {
  err: string
}

export type WSAuthUserLoginQrMessage = WSAuthUserLoginQrGenMessage &
  WSAuthUserLoginQrPingMessage &
  WSAuthUserLoginQrUserMessage &
  WSAuthUserLoginQrMsgMessage &
  WSAuthUserLoginQrErrMessage

export type WSAuthUserLoginQrPayload = { action: 'ping' }
// | {
//     action: 'check' | 'close'
//     data: string // qrcode_key
//   }

export default defineWebSocketHandler({
  async open(peer) {
    // console.log('[ws] open', peer)
    const res = await AuthUserLoginQr().catch((err: Error) => {
      throw new HTTPError('Failed to initiate QR code login', {
        statusCode: 500,
        cause: err,
      })
    })
    peer.send({ gen: res })
    peer.subscribe(res.qrcode_key)
    const intervalId = setInterval(async () => {
      await AuthUserLoginQr({
        qrcode_key: res.qrcode_key,
      })
        .then((user) => {
          peer.publish(res.qrcode_key, { user })
          peer.unsubscribe(res.qrcode_key)
          clearInterval(intervalId)
          peer.close()
        })
        .catch((err: HTTPError) => {
          if (err.status === 400)
            peer.publish(res.qrcode_key, { msg: err.message })
          else if (err.status === 500) {
            peer.publish(res.qrcode_key, { err: err.message })
            peer.unsubscribe(res.qrcode_key)
            clearInterval(intervalId)
            peer.close()
          }
        })
    }, 3000)
    setTimeout(() => {
      clearInterval(intervalId)
      peer.publish(res.qrcode_key, { err: '二维码登录超时' })
      peer.unsubscribe(res.qrcode_key)
      peer.close()
    }, 180000)
  },

  async message(peer, _message) {
    // 暂时无法解决若在此结束连接后，interval 仍然继续运行的问题 (不依赖外部存储)
    // （虽然如果check完，上面最多也会在一次检查api发现已登录后自动结束）

    // console.log('[ws] message', peer, message)
    // const msg = message.json() as WSAuthUserLoginQrPayload
    // if (msg.action === 'check') {
    //   await AuthUserLoginQr({
    //     qrcode_key: msg.data,
    //   })
    //     .then((user) => {
    //       peer.publish(msg.data, { user })
    //       peer.unsubscribe(msg.data)
    //       peer.close()
    //     })
    //     .catch((err: HTTPError) => {
    //       if (err.status === 400) peer.publish(msg.data, { msg: err.message })
    //       else if (err.status === 500) {
    //         peer.publish(msg.data, { err: err.message })
    //         peer.unsubscribe(msg.data)
    //         peer.close()
    //       }
    //     })
    // }
    // if (msg.action === 'close') {
    //   peer.unsubscribe(msg.data)
    //   peer.close()
    // }
    peer.send({ ping: 'pong' })
  },

  // close(peer, event) {
  //   console.log('[ws] close', peer, event)
  // },

  error(peer, error) {
    // console.log('[ws] error', peer, error)
    throw new HTTPError('WebSocket error', {
      statusCode: 500,
      cause: error,
      body: { peer },
    })
  },
})
