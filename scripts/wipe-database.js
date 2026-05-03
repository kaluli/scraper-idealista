#!/usr/bin/env node
/**
 * Vacía todas las tablas (listings, neighborhoods) para empezar de cero.
 * PostgreSQL: TRUNCATE ... RESTART IDENTITY.
 *
 * Uso:
 *   node scripts/wipe-database.js local
 *   CONFIRM=VACIAR node scripts/wipe-database.js production
 *
 * En producción hace falta CONFIRM=VACIAR en el entorno.
 */

const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const mode = (process.argv[2] || '').toLowerCase()
const root = path.resolve(__dirname, '..')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    process.env[key] = val
  })
}

function loadEnvLocal() {
  for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    parseEnvFile(path.join(root, name))
  }
}

function loadEnvProduction() {
  parseEnvFile(path.join(root, '.env.production'))
}

function isPostgresUrl(url) {
  return (
    url.startsWith('postgres://') || url.startsWith('postgresql://')
  )
}

/** Local dev: Postgres en localhost o rama Neon de desarrollo */
function postgresUrlLooksLocal(url) {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('neon.tech')
  )
}

async function truncateAll(prisma) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE listings, neighborhoods RESTART IDENTITY CASCADE'
  )
}

async function main() {
  if (mode !== 'local' && mode !== 'production') {
    console.error('Uso: node scripts/wipe-database.js <local|production>')
    process.exit(1)
  }

  if (mode === 'local') {
    loadEnvLocal()
    const url = process.env.DATABASE_URL || ''
    if (!isPostgresUrl(url)) {
      console.error(
        '❌ DATABASE_URL no es postgresql:// (revisá .env.development.local)'
      )
      process.exit(1)
    }
    if (!postgresUrlLooksLocal(url)) {
      console.error(
        '❌ Modo local: usá Postgres en localhost/127.0.0.1 o una rama dev (*.neon.tech).'
      )
      process.exit(1)
    }
  } else {
    if (process.env.CONFIRM !== 'VACIAR') {
      console.error('❌ Producción: ejecutá con CONFIRM=VACIAR en la misma línea.')
      console.error('   Ejemplo: CONFIRM=VACIAR node scripts/wipe-database.js production')
      process.exit(1)
    }
    loadEnvProduction()
    const prodPath = path.join(root, '.env.production')
    if (!fs.existsSync(prodPath)) {
      console.error('❌ No existe .env.production')
      process.exit(1)
    }
    const url = process.env.DATABASE_URL || ''
    if (!isPostgresUrl(url)) {
      console.error('❌ DATABASE_URL en .env.production no es postgresql://')
      process.exit(1)
    }
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.error(
        '❌ La URL en .env.production parece local (localhost). Revisá antes de vaciar.'
      )
      process.exit(1)
    }
  }

  const prisma = new PrismaClient()
  try {
    console.log(
      mode === 'local'
        ? '🗑️  Vaciando base LOCAL (Postgres)...'
        : '🗑️  Vaciando base de PRODUCCIÓN (Postgres)...'
    )
    await truncateAll(prisma)
    console.log('✅ Tablas `listings` y `neighborhoods` vacías.')
  } catch (e) {
    console.error('❌ Error:', e.message || e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
