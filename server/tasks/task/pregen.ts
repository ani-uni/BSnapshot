import { HTTPError } from 'nitro/h3'
import { defineTask } from 'nitro/task'
import type { TaskPayload } from '~/server/types/tasks/payload'
import type { TaskResult } from '~/server/types/tasks/result'
import { bigint2string } from '~/server/utils/bigint'
import { User } from '~/server/utils/common/user'
import { getVideoBasic, type VideoBasic } from '~/server/utils/video/main'

export type TaskTaskPreGenPayload =
  | {
      type: 'aid'
      id: bigint
    }
  | {
      type: 'bvid'
      id: string
    }
  | {
      type: 'cid'
      id: bigint
    }

export type TaskTaskPreGenResult = VideoBasic

export default defineTask<TaskResult<TaskTaskPreGenResult>>({
  meta: {
    name: 'task:pregen',
    description: 'Pre-generate clip resources',
  },
  async run({ payload }: { payload: TaskPayload<TaskTaskPreGenPayload> }) {
    if (
      !payload.type ||
      !payload.id ||
      (payload.type === 'cid' && typeof payload.id !== 'bigint') ||
      (payload.type === 'aid' && typeof payload.id !== 'bigint') ||
      (payload.type === 'bvid' && typeof payload.id !== 'string')
    )
      throw new HTTPError('Invalid payload', { statusCode: 400 })
    const res = await TaskPreGen(payload as TaskTaskPreGenPayload)
    return { result: bigint2string(res) }
  },
})

export async function TaskPreGen(
  payload: TaskTaskPreGenPayload,
): Promise<TaskTaskPreGenResult> {
  if (payload.type === 'cid') {
    return {
      aid: 0n,
      bvid: '',
      title: '',
      pubdate: 0,
      upMid: 0n,
      pages: [
        {
          cid: payload.id,
          page: 1,
          part: `cid: ${payload.id}`,
          duration: 0,
        },
      ],
    }
  } else {
    const abBasic = getVideoBasic(
      await User.fromRotating(),
      payload.type === 'aid' ? { aid: payload.id } : { bvid: payload.id },
    )
    return abBasic
  }
}
