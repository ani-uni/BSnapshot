import 'dotenv/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '~/generated/prisma/client'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? '.data/db/prisma.db',
})

const prisma = new PrismaClient({ adapter })

export { prisma }
