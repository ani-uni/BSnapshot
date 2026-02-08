import { defineHandler } from 'nitro/h3'
import { AuthUserList } from '~/server/tasks/auth/user/list'
import { bigint2string } from '~/server/utils/bigint'

export default defineHandler(async () => {
  const res = await AuthUserList()
  return bigint2string(res)
})
