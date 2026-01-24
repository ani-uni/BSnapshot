import { defineHandler, HTTPError } from 'nitro/h3'
import { ClipLintAndFmt } from '~/server/utils/clip-lint-fmt'

export default defineHandler(async ({ req }) => {
  const payload = (await req.json()) as [number, number][]
  if (
    !Array.isArray(payload) ||
    !payload.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number',
    )
  ) {
    throw new HTTPError('Invalid payload', { statusCode: 400 })
  }
  const res = ClipLintAndFmt(payload)
  return res
})
