import { defineHandler } from 'nitro/h3'
import { AuthUserList } from '~s/tasks/auth/user/list'
import { bigint2string } from '~s/utils/bigint'

export default defineHandler(async () => {
  const res = await AuthUserList()
  return bigint2string(res)
})
