import { defineTask } from 'nitro/task'

export default defineTask({
  meta: {
    name: 'echo:payload',
    description: 'Returns the provided payload',
  },
  run({ payload, context }) {
    console.log('Running echo task...')
    return { result: payload }
  },
})
