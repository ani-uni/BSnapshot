import { defineHandler } from 'nitro/h3'
import { version as nitroVersion } from 'nitro/meta'
import pkg from '~/package.json'
import { prisma } from '~s/utils/prisma'

export default defineHandler(async () => {
  const userExist = !((await prisma.user.findFirst({ select: {} })) !== null)
  return {
    name: pkg.name,
    version: pkg.version,
    nitroVersion,
    userExist,
  }
})
