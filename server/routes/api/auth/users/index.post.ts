import { defineHandler } from 'nitro/h3'
import { AuthUserCheck } from '~/server/tasks/auth/user/check'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async () => {
  const res = await AuthUserCheck()
  return bigint2string(res)
})
