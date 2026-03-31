import { defineHandler } from 'nitro/h3'
import { checkUpdate } from '~s/utils/check-update'

export default defineHandler(async () => {
	const updateInfo = await checkUpdate()
	return updateInfo
})
