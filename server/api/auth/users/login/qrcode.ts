import { defineWebSocketHandler, HTTPError } from 'nitro/h3'
import type { UserModel } from '~/generated/prisma/models'
import { AuthUserLoginQr } from '~/server/tasks/auth/user/login_qr'
import { bigint2string } from '~/server/utils/bigint'

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

export type WSAuthUserLoginQrMessage =
  | WSAuthUserLoginQrGenMessage
  | WSAuthUserLoginQrPingMessage
  | WSAuthUserLoginQrUserMessage
  | WSAuthUserLoginQrMsgMessage
  | WSAuthUserLoginQrErrMessage

export type WSAuthUserLoginQrPayload = { action: 'ping' | 'check' }

const peers = new WeakMap<object, { cleanup: () => void; qrcodeKey: string }>()

export default defineWebSocketHandler({
  async open(peer) {
    let isClosed = false
    const timers: { interval?: NodeJS.Timeout; timeout?: NodeJS.Timeout } = {}

    const cleanup = () => {
      isClosed = true
      if (timers.interval) clearInterval(timers.interval)
      if (timers.timeout) clearTimeout(timers.timeout)
    }

    try {
      const res = await AuthUserLoginQr()

      if (isClosed) return

      peers.set(peer, { cleanup, qrcodeKey: res.qrcode_key })

      peer.send({
        gen: {
          qrcode_key: res.qrcode_key,
          qrcode_url: res.url,
        },
      })

      timers.interval = setInterval(async () => {
        if (isClosed) return
        try {
          const user = await AuthUserLoginQr({
            qrcode_key: res.qrcode_key,
          })
          peer.send(bigint2string({ user }))
          peer.close()
        } catch (err: unknown) {
          const httpErr = err as HTTPError
          if (httpErr.status === 400) {
            peer.send({ msg: httpErr.message })
          } else if (httpErr.status === 500) {
            peer.send({ err: httpErr.message })
            peer.close()
          }
        }
      }, 3000)

      timers.timeout = setTimeout(() => {
        if (isClosed) return
        peer.send({ err: '二维码登录超时' })
        peer.close()
      }, 180000)
    } catch (err) {
      if (!isClosed) {
        throw err
      }
    }
  },

  async message(peer, message) {
    const payload = message.json() as WSAuthUserLoginQrPayload

    if (payload.action === 'check') {
      const peerData = peers.get(peer)
      if (!peerData) {
        peer.send({ err: '连接已关闭' })
        return
      }

      try {
        const user = await AuthUserLoginQr({
          qrcode_key: peerData.qrcodeKey,
        })
        peer.send(bigint2string({ user }))
        peer.close()
      } catch (err: unknown) {
        const httpErr = err as HTTPError
        if (httpErr.status === 400) {
          peer.send({ msg: httpErr.message })
        } else if (httpErr.status === 500) {
          peer.send({ err: httpErr.message })
          peer.close()
        }
      }
      return
    }

    peer.send({ ping: 'pong' })
  },

  close(peer) {
    peers.get(peer)?.cleanup()
    peers.delete(peer)
  },

  error(peer, error) {
    throw new HTTPError('WebSocket error', {
      statusCode: 500,
      cause: error,
      body: { peer },
    })
  },
})
