import { defineWebSocketHandler, HTTPError } from 'nitro/h3'
import z from 'zod'
import { Event } from '~s/utils/common/event'

const cmds = z.xor([
  z.object({ cmd: z.literal('ping') }),
  z.object({ cmd: z.literal('list'), after: z.int().nonnegative().optional() }),
  z.object({ cmd: z.literal('toggle-auto-refresh') }),
])

let cursor: number
let intervalId: NodeJS.Timeout

async function listEvents(after?: number) {
  const events = await Event.listEvents(after)
  cursor = events[events.length - 1]?.id ?? cursor
  return events
}

export default defineWebSocketHandler({
  async message(peer, message) {
    const cmd = cmds.safeParse(message.json())
    if (cmd.success) {
      if (cmd.data.cmd === 'ping') peer.send({ cmd: 'pong' })
      else if (cmd.data.cmd === 'list') {
        if (intervalId) return
        const events = await listEvents(cmd.data.after)
        peer.send({ success: true, events })
      } else if (cmd.data.cmd === 'toggle-auto-refresh') {
        if (intervalId) clearInterval(intervalId)
        else
          intervalId = setInterval(async () => {
            const events = await listEvents(cursor)
            peer.send(events)
          }, 3000)
      }
    } else peer.send(cmd)
    return
  },

  close() {
    if (intervalId) clearInterval(intervalId)
  },

  error(peer, error) {
    if (intervalId) clearInterval(intervalId)
    throw new HTTPError('WebSocket error', {
      statusCode: 500,
      cause: error,
      body: { peer },
    })
  },
})
