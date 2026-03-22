const test_url = 'https://www.bilibili.com/'

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch(test_url, {
      method: 'HEAD',
      cache: 'no-cache',
    })
    return response.ok
  } catch {
    return false
  }
}
