import pkg from '~/package.json'

class HeadersClass {
  static readonly bili_web = new Headers({
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
  })
  static readonly app = new Headers({
    'User-Agent': `ani-uni/BSnapshot/${pkg.version} (${pkg.homepage})`,
  })
  get idn(): 'bili_web' | 'app' {
    return 'app'
  }
  get(idn: 'bili_web' | 'app') {
    return HeadersClass[idn]
  }
}

export const headers = new HeadersClass()
