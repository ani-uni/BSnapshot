import { defineWebSocketHandler, HTTPError } from 'nitro/h3'
import z from 'zod'
import { Event } from '~s/utils/common/event'

const cmds = z.xor([
  z.object({ cmd: z.literal('ping') }),
  z.object({ cmd: z.literal('list'), after: z.int().nonnegative().optional() }),
  z.object({ cmd: z.literal('toggle-auto-refresh') }),
])

interface PeerState {
  cursor: number
  intervalId?: NodeJS.Timeout
}

const peerStates = new WeakMap<object, PeerState>()

function getPeerState(peer: object): PeerState {
  let state = peerStates.get(peer)
  if (!state) {
    state = { cursor: 0 }
    peerStates.set(peer, state)
  }
  return state
}

async function listEvents(after?: number) {
  const events = await Event.listEvents(after)
  const newCursor = events[events.length - 1]?.id ?? after ?? 0
  return { events, newCursor }
}

export default defineWebSocketHandler({
  async message(peer, message) {
    const peerState = getPeerState(peer)
    const cmd = cmds.safeParse(message.json())

    if (cmd.success) {
      if (cmd.data.cmd === 'ping') {
        peer.send({ success: true, data: 'pong' })
      } else if (cmd.data.cmd === 'list') {
        if (peerState.intervalId) {
          peer.send({
            success: false,
            error: 'Auto-refresh is on',
          })
          return
        }
        const { events, newCursor } = await listEvents(cmd.data.after)
        peerState.cursor = newCursor
        peer.send({ success: true, events })
      } else if (cmd.data.cmd === 'toggle-auto-refresh') {
        if (peerState.intervalId) {
          clearInterval(peerState.intervalId)
          peerState.intervalId = undefined
        } else {
          peerState.intervalId = setInterval(async () => {
            const { events, newCursor } = await listEvents(peerState.cursor)
            peerState.cursor = newCursor
            peer.send({ success: true, events })
          }, 3000)
        }
      }
    } else peer.send(cmd)
    return
  },

  close(peer) {
    const peerState = peerStates.get(peer)
    if (peerState?.intervalId) {
      clearInterval(peerState.intervalId)
    }
    peerStates.delete(peer)
  },

  error(peer, error) {
    const peerState = peerStates.get(peer)
    if (peerState?.intervalId) {
      clearInterval(peerState.intervalId)
    }
    peerStates.delete(peer)
    throw new HTTPError('WebSocket error', {
      statusCode: 500,
      cause: error,
      body: { peer },
    })
  },
})
