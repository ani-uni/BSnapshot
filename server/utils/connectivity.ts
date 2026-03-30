import { headers } from './headers'

const test_url = 'https://www.bilibili.com/'

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch(test_url, {
      method: 'HEAD',
      cache: 'no-cache',
      headers: headers.get('bili_web'),
    })
    return response.ok
  } catch {
    return false
  }
}
