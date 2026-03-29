import 'dotenv/config'
import path from 'node:path'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '~/generated/prisma/client'

const dbPath =
  process.env.DATABASE_URL ??
  (process.env.USER_DATA_PATH
    ? `file:${path.resolve(process.env.USER_DATA_PATH, '.data/db/prisma.db')}`
    : 'file:.data/db/prisma.db')

const adapter = new PrismaLibSql({
  url: dbPath,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
