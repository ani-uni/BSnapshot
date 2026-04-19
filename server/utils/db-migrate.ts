import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

import init_sql from '~/prisma/migrations/0_init/migration.sql?raw'
import add_video_source_sql from '~/prisma/migrations/20260408153716_add_video_source/migration.sql?raw'
import sn_may_be_float_sql from '~/prisma/migrations/20260411152213_sn_may_be_float/migration.sql?raw'

import { prisma } from './prisma'

const dbMigrationLockPath = process.env.USER_DATA_PATH
  ? path.resolve(process.env.USER_DATA_PATH, '.data/db/prisma.migration-lock')
  : '.data/db/prisma.migration-lock'

const db2ver = {
  '0.0.1': 0,
  '0.0.3': 1,
  '0.0.7': 2,
} as const

const sqls = {
  '0_init': init_sql,
  '20260408153716_add_video_source': add_video_source_sql,
  '20260411152213_sn_may_be_float': sn_may_be_float_sql,
} as const

const ver2db = (ver: string) => {
  const v = db2ver[ver as keyof typeof db2ver]
  if (v === undefined) {
    for (const [k, ev] of Object.entries(db2ver).toReversed()) {
      if (ver >= k) return ev
    }
  }
  return -1
}

const migrateDB = async () => {
  if (!fs.existsSync(dbMigrationLockPath)) {
    fs.mkdirSync(path.dirname(dbMigrationLockPath), { recursive: true })
    fs.writeFileSync(dbMigrationLockPath, '[]')
  }
  let done_raw = fs.readFileSync(dbMigrationLockPath, 'utf-8')
  if (done_raw === '') done_raw = '[]'
  try {
    JSON.parse(done_raw)
  } catch {
    done_raw = '[]'
  }
  const done = new Set<keyof typeof sqls>(JSON.parse(done_raw) ?? [])
  const execMigrate = async (migration: keyof typeof sqls) => {
    if (!done.has(migration)) {
      await prisma.$executeRawUnsafe(sqls[migration])
      done.add(migration)
    }
  }
  for (const migration of Object.keys(sqls) as (keyof typeof sqls)[]) {
    await execMigrate(migration)
  }
  fs.writeFileSync(dbMigrationLockPath, JSON.stringify([...done]))
}

export { migrateDB, ver2db }
