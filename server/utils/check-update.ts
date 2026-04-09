import ky from 'ky'
import { HTTPError } from 'nitro'
import z from 'zod'

import pkg from '~/package.json'

const repo = pkg.repository.url
    .replaceAll('git+https://github.com/', '')
    .replaceAll('.git', ''),
  ver = pkg.version.replace(/^v/i, ''),
  platform = process.platform

const gitHubReleaseAssetSchema = z.object({
  name: z.string(),
  size: z.number(),
  content_type: z.string(),
  browser_download_url: z.url(),
})

const gitHubReleaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullable(),
  body: z.string().nullable(),
  assets: z.array(gitHubReleaseAssetSchema).default([]),
})

const releaseInfoSchema = z.object({
  tag: z.string(),
  name: z.string(),
  description: z.string(),
  assets: z.array(gitHubReleaseAssetSchema),
})

const updateInfoSchema = z.discriminatedUnion('isLatest', [
  z.object({
    repo: z.string(),
    platform: z.string(),
    ver: z.string(),
    isLatest: z.literal(true),
  }),
  z.object({
    repo: z.string(),
    platform: z.string(),
    ver: z.string(),
    isLatest: z.literal(false),
    onlyWeb: z.boolean(),
    dl_link: z.string().optional(),
    release: releaseInfoSchema,
  }),
])

const base = { repo, platform, ver }

export async function checkUpdate() {
  return ky
    .get(`https://api.github.com/repos/${repo}/releases/latest`, {
      throwHttpErrors: false,
    })
    .then(async (res) => {
      if (res.status === 404) {
        // GitHub returns 404 when the repository has no published release.
        return updateInfoSchema.parse({
          ...base,
          isLatest: true,
        })
      }
      if (!res.ok) {
        throw new HTTPError(
          `GitHub release API request failed: ${res.status}`,
          { statusCode: res.status },
        )
      }
      const data = await res.json<z.infer<typeof gitHubReleaseSchema>>()
      const release = gitHubReleaseSchema.parse(data)
      const latestVersion = release.tag_name.replace(/^v/i, '')
      if (latestVersion <= ver) {
        return updateInfoSchema.parse({
          ...base,
          isLatest: true,
        })
      }
      return updateInfoSchema.parse({
        ...base,
        isLatest: false,
        dl_link: release.assets.find((a) => a.name.includes(platform))
          ?.browser_download_url,
        onlyWeb: release.body?.includes('# Only Web (v0)') ?? false,
        release: {
          tag: release.tag_name,
          name: release.name ?? release.tag_name,
          description: release.body?.trim() || 'No description provided.',
          assets: release.assets,
        },
      })
    })
}
