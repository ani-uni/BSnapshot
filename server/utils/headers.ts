import pkg from '~/package.json'

export const headers = {
  bili_web: new Headers({
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
  }),
  app: new Headers({
    'User-Agent': `ani-uni/BSnapshot/${pkg.version} (${pkg.homepage})`,
  }),
}
