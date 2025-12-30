import { HTTPError } from 'nitro/h3'
import { Cookie as CK } from 'tough-cookie'
import { headers } from './headers'

// type CKIns = InstanceType<typeof CK>
type CKJSON = ReturnType<CK['toJSON']>

const parseCK = (raw: unknown): CK | undefined => {
  if (!raw) return undefined
  if (raw instanceof CK) return raw
  if (typeof raw === 'string') return CK.parse(raw) ?? undefined
  if (typeof raw === 'object' && raw !== null) {
    try {
      return CK.fromJSON(raw as CKJSON) ?? undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

const parseCKs = (raw: unknown): CK[] | undefined => {
  if (!raw) return undefined
  if (raw instanceof Cookies)
    return raw.cookies ? parseCKs(raw.cookies) : undefined
  if (typeof raw === 'string') {
    const list = raw
      .split(';')
      .map((seg) => parseCK(seg.trim()))
      .filter((ck): ck is CK => !!ck)
    return list.length ? list : undefined
  }
  if (Array.isArray(raw)) {
    const list = raw.map((seg) => parseCK(seg)).filter((ck): ck is CK => !!ck)
    return list.length ? list : undefined
  }
  if (typeof raw === 'object' && raw !== null) {
    const maybe = (raw as { cookies?: unknown }).cookies
    if (maybe) return parseCKs(maybe)
  }
  return undefined
}

export class Cookies {
  public cookies?: CK[]
  constructor(ck?: unknown) {
    this.cookies = parseCKs(ck)
  }
  get hasCookies() {
    return !!this.cookies && this.cookies.length > 0
  }
  static parseHeaders(headers: Headers) {
    const setCookies = headers.getSetCookie()
    if (setCookies.length > 0) {
      const cks = setCookies
        .map((ck) => CK.parse(ck))
        .filter((c): c is CK => !!c)
      return new Cookies(cks)
    } else return new Cookies()
  }
  get(k: string) {
    return this.cookies?.find((c) => c.key === k)?.value || null
  }
  getOrThrow(k: string) {
    const v = this.get(k)
    if (v === null)
      throw new HTTPError(`Cookie ${k} not found`, { statusCode: 500 })
    return v
  }
  set(k: string | ((ck: typeof CK) => void), v?: string) {
    if (typeof k === 'function') {
      k(CK)
    } else {
      if (!v) return
      if (!this.cookies) this.cookies = []
      const cookie = this.cookies.find((c) => c.key === k)
      if (cookie) cookie.value = v
      else {
        const tck = CK.parse(`${k}=${v}`)
        if (tck) this.cookies.push(tck)
      }
    }
  }
  toString() {
    return this.cookies
      ? this.cookies.map((cookie) => cookie.cookieString()).join('; ')
      : ''
  }
  toHeaders(): typeof headers {
    if (this.hasCookies && this.cookies) headers.set('Cookie', this.toString())
    return headers
  }
  toJSON() {
    return {
      cookies: this.cookies?.map((ck) => ck.toJSON()) ?? [],
    }
  }
}
