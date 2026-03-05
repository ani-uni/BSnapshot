import crypto from 'node:crypto'
import ky from 'ky'
import { HTTPError } from 'nitro/h3'
import { Cookies } from '~s/utils/cookies'

interface BiliTicket {
  code: 0
  message: 'OK'
  data: {
    ticket: string
    created_at: string
    ttl: 259200
    context: object
    nav: {
      img: string
      sub: string
    }
  }
  ttl: 1
}

/**
 * Generate HMAC-SHA256 signature
 * @param {string} key     The key string to use for the HMAC-SHA256 hash
 * @param {string} message The message string to hash
 * @returns {string} The HMAC-SHA256 signature as a hex string
 */
function hmacSha256(key: string, message: string): string {
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(message)
  return hmac.digest('hex')
}

export async function getBiliTicket(cookies: Cookies = new Cookies()) {
  const ts = Math.floor(Date.now() / 1000)
  const hexSign = hmacSha256('XgwSnGZ1p', `ts${ts}`)
  const url =
    'https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket'
  const params = new URLSearchParams({
    key_id: 'ec02',
    hexsign: hexSign,
    'context[ts]': ts.toString(),
    csrf: cookies.getOrThrow('bili_jct'),
  })
  const response = await ky.post(`${url}?${params.toString()}`, {
    headers: cookies.toHeaders('bili_web'),
  })
  if (!response.ok) {
    throw new HTTPError(`HTTP error! status: ${response.status}`, {
      status: 500,
    })
  }
  return response.json<BiliTicket>().then((res) => {
    if (res?.code === 0 && res?.data) {
      return res.data
    }
    return null
  })
}
