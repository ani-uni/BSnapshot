import ky from 'ky'
import { Cookies } from '~s/utils/cookies'

interface BuvidResponse {
  code: 0
  data: {
    b_3: string
    b_4: string
  }
  message: 'ok'
}

export async function Buvid(cookies: Cookies = new Cookies()) {
  return ky
    .get('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: cookies.toHeaders('bili_web'),
    })
    .json<BuvidResponse>()
    .then((res) => {
      if (res?.code === 0 && res?.data) {
        return res.data
      }
      return null
    })
}
