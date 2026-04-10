import { defineHandler } from 'nitro/h3'
import { version as nitroVersion } from 'nitro/meta'
import { ver2db } from '~s/utils/db-migrate'
import { prisma } from '~s/utils/prisma'

import pkg from '~/package.json'

export default defineHandler(async () => {
  const userExist = !(
    (await prisma.user.findFirst({ select: { mid: true } })) === null
  )
  return {
    name: pkg.name,
    version: pkg.version,
    dbVersion: ver2db(pkg.version),
    nitroVersion,
    userExist,
  }
})
