import { md5 } from 'js-md5'
import ky from 'ky'
import qs from 'qs'
import { Cookies } from '../../cookies'

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
]

// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig: string) =>
  mixinKeyEncTab
    .map((n) => orig[n])
    .join('')
    .slice(0, 32)

// 为请求参数进行 wbi 签名
export function encWbi(
  params: { [key: string]: unknown } | string,
  img_key: string,
  sub_key: string,
) {
  if (typeof params === 'string') params = qs.parse(params)

  const mixin_key = getMixinKey(img_key + sub_key),
    curr_time = Math.round(Date.now() / 1000),
    chr_filter = /[!'()*]/g

  Object.assign(params, { wts: curr_time }) // 添加 wts 字段
  // 按照 key 重排参数
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      if (
        !params[key] ||
        !(typeof params[key] === 'string' || typeof params[key] === 'number')
      )
        return `${encodeURIComponent(key)}=`
      // 过滤 value 中的 "!'()*" 字符
      const value = params[key].toString().replace(chr_filter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  const wbi_sign = md5(query + mixin_key) // 计算 w_rid

  return `${query}&w_rid=${wbi_sign}`
}
export function url2key(url?: string) {
  if (!url) return ''
  return url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
}
// 获取最新的 img_key 和 sub_key
export async function getWbiKeys(cookies: Cookies = new Cookies()) {
  const res = await ky
    .get('https://api.bilibili.com/x/web-interface/nav', {
      headers: cookies.toHeaders(),
    })
    .json<{
      code: 0
      message: 'OK'
      ttl: 1
      data: {
        wbi_img: { img_url: string; sub_url: string }
      }
    }>()
    .then((res) => {
      if (res?.data.wbi_img) {
        return res.data.wbi_img
      }
      return null
    })
  if (!res) return null
  const { img_url, sub_url } = res

  return {
    img_key: url2key(img_url),
    sub_key: url2key(sub_url),
  }
}
