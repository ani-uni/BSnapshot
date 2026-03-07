import { defineHandler, readValidatedBody } from 'nitro/h3'
import { ClipsSchema } from '~s/types/task'
import { ClipLintAndFmt } from '~s/utils/clip-lint-fmt'

export default defineHandler(async (event) => {
  const payload = await readValidatedBody(event, ClipsSchema)
  const res = ClipLintAndFmt(payload)
  return res
})
