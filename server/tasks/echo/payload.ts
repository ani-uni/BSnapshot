import { defineTask } from 'nitro/task'

export default defineTask({
  meta: {
    name: 'echo:payload',
    description: 'Returns the provided payload',
  },
  run({ payload, context }) {
    console.log('Running echo task...')
    if (payload.error) throw new Error('Echo task error for testing purposes')
    return { result: payload }
  },
})
