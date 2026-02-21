import { defineHandler } from 'nitro/h3'
import { ConfigGet } from '~s/tasks/config/get'
import { bigint2string } from '~s/utils/bigint'

export default defineHandler(async () => {
  const data = await ConfigGet()
  return bigint2string(data)
})
