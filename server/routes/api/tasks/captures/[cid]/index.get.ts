import { defineHandler, getRouterParam, HTTPError } from 'nitro/h3'
import { Capture } from '~/server/utils/common/capture'

export default defineHandler(async (event) => {
	const cid_raw = getRouterParam(event, 'cid')
	if (!cid_raw) {
		throw new HTTPError('Missing cid', { statusCode: 400 })
	}
	const capture = await Capture.loadFromCID(BigInt(cid_raw))
	return capture.toJSON
})
