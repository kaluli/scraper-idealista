#!/usr/bin/env node
/**
 * Ejecuta prisma db push contra la base de datos de producción.
 * Carga DATABASE_URL desde .env.production.
 *
 * Uso: node scripts/db-push-prod.js
 */

const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.production')

if (!fs.existsSync(envPath)) {
  console.error('❌ No existe .env.production. Creálo con DATABASE_URL de producción.')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
content.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    process.env[key] = val
  }
})

const u = process.env.DATABASE_URL || ''
if (
  !u.startsWith('postgresql://') &&
  !u.startsWith('postgres://')
) {
  console.error('❌ DATABASE_URL en .env.production no es postgresql://')
  process.exit(1)
}

console.log('🔗 Aplicando schema en producción (Postgres)...\n')
execSync('npx prisma db push', { stdio: 'inherit', env: process.env, cwd: root })
console.log('\n✅ Schema aplicado en producción.')
