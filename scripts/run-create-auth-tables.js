#!/usr/bin/env node
/**
 * Aplica scripts/sql/create-auth-tables-postgres.sql contra DATABASE_URL.
 * Uso con prod: DATABASE_URL desde .env.sync.vercel.prod (vercel env pull).
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const sqlPath = path.join(__dirname, 'sql', 'create-auth-tables-postgres.sql')

function loadDatabaseUrl() {
  const envPath = path.join(root, '.env.sync.vercel.prod')
  if (!fs.existsSync(envPath)) {
    console.error('❌ Falta .env.sync.vercel.prod (vercel env pull --environment production)')
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^DATABASE_URL=(.*)$/)
    if (!m) continue
    let val = m[1].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    return val
  }
  console.error('❌ DATABASE_URL no encontrado en .env.sync.vercel.prod')
  process.exit(1)
}

const databaseUrl = (process.env.DATABASE_URL || loadDatabaseUrl()).trim()

const r = spawnSync(
  'npx',
  ['prisma', 'db', 'execute', '--file', sqlPath, '--url', databaseUrl],
  {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 10 * 1024 * 1024,
  }
)

if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
if (r.status !== 0) {
  console.error('❌ prisma db execute falló:', r.status)
  process.exit(r.status || 1)
}
console.log('✅ Tablas users / user_listing_states listas (sin tocar columnas legacy en listings).')
