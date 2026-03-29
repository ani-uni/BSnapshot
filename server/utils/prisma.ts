import 'dotenv/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '~/generated/prisma/client'

const dbPath = process.env.DATABASE_URL ?? 'file:.data/db/prisma.db'

const adapter = new PrismaLibSql({
  url: dbPath,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
