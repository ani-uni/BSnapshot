import { defineHandler } from 'nitro/h3'
import { version as nitroVersion } from 'nitro/meta'
import { db2ver } from '~s/utils/db-migrate'
import { prisma } from '~s/utils/prisma'

import pkg from '~/package.json'

export default defineHandler(async () => {
  const userExist = !(
    (await prisma.user.findFirst({ select: { mid: true } })) === null
  )
  return {
    name: pkg.name,
    version: pkg.version,
    dbVersion: db2ver[pkg.version as keyof typeof db2ver] ?? -1,
    nitroVersion,
    userExist,
  }
})
