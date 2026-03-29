import 'dotenv/config'
import Database from 'libsql'
import init_sql from '~/prisma/migrations/0_init/migration.sql?raw'

const dbPath = process.env.DATABASE_URL ?? 'file:.data/db/prisma.db'

const db2ver = {
  '0.0.1': 0,
} as const

const migrateDB = (s: number | string = 0, e?: number | string) => {
  if (!e) e = s
  if (typeof s === 'string') s = db2ver[s as keyof typeof db2ver] ?? 0
  if (typeof e === 'string') e = db2ver[e as keyof typeof db2ver] ?? 0
  const db = new Database(dbPath)
  for (let v = s; v <= e; v++) {
    if (v === 0) {
      db.exec(init_sql)
    }
  }
  db.close()
}

export { migrateDB, db2ver }
