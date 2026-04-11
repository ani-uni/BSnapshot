import { defineHandler } from 'nitro/h3'
import { version as nitroVersion } from 'nitro/meta'
import { User } from '~s/utils/common/user'
import { ver2db } from '~s/utils/db-migrate'

import pkg from '~/package.json'

export default defineHandler(async () => {
  return {
    name: pkg.name,
    version: pkg.version,
    dbVersion: ver2db(pkg.version),
    nitroVersion,
    userExist: await User.exist(),
  }
})
