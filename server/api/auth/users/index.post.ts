import { defineHandler } from 'nitro/h3'
import { AuthUserCheck } from '~s/tasks/auth/user/check'
import { bigint2string } from '~s/utils/bigint'

export default defineHandler(async () => {
  const res = await AuthUserCheck()
  return bigint2string(res)
})
