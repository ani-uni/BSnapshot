import 'dotenv/config'
import path from 'node:path'

import Database from 'libsql'

import pkg from '~/package.json' with { type: 'json' }
import init_sql from '~/prisma/migrations/0_init/migration.sql?raw'
import add_video_source_sql from '~/prisma/migrations/20260408153716_add_video_source/migration.sql?raw'

const dbPath =
  process.env.DATABASE_URL ??
  (process.env.USER_DATA_PATH
    ? `file:${path.resolve(process.env.USER_DATA_PATH, '.data/db/prisma.db')}`
    : 'file:.data/db/prisma.db')

const db2ver = {
  '0.0.1': 0,
  '0.0.3': 1,
} as const

const migrateDB = (
  s: number | string = -1,
  e: number | string = pkg.version,
) => {
  if (!e) e = s
  if (typeof s === 'string') s = db2ver[s as keyof typeof db2ver] ?? 0
  if (typeof e === 'string') e = db2ver[e as keyof typeof db2ver] ?? 0
  const db = new Database(dbPath)
  for (let v = s + 1; v <= e; v++) {
    switch (v) {
      case 0:
        db.exec(init_sql)
        break
      case 1:
        db.exec(add_video_source_sql)
        break
      default:
        break
    }
  }
  db.close()
}

export { migrateDB, db2ver }
