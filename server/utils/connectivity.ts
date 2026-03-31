import ky from 'ky'
import { headers } from './headers'

const test_url = 'https://www.bilibili.com/'

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await ky.head(test_url, {
      cache: 'no-cache',
      headers: headers.get('bili_web'),
    })
    return response.ok
  } catch {
    return false
  }
}
