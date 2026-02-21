import { defineHandler, readValidatedBody } from 'nitro/h3'
import z from 'zod'
import { ClipLintAndFmt } from '~s/utils/clip-lint-fmt'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(
    event,
    z.array(z.tuple([z.number(), z.number()])),
  )
  const res = ClipLintAndFmt(payload)
  return res
})
