import { defineTask } from 'nitro/task'
import type { TaskResult } from '~s/types/tasks/result'
import { bigint2string } from '~s/utils/bigint'
import { User, type UserWithoutDetails } from '~s/utils/common/user'

export type TaskAuthUserListResult = UserWithoutDetails[]

export default defineTask<TaskResult<TaskAuthUserListResult>>({
  meta: {
    name: 'auth:user:list',
    description: 'List all users',
  },
  async run() {
    const result = await AuthUserList()
    return bigint2string({ result })
  },
})

export async function AuthUserList(): Promise<TaskAuthUserListResult> {
  const result = await User.list()
  return result
}
