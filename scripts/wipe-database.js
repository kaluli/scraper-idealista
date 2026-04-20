#!/usr/bin/env node
/**
 * Vacía todas las tablas (listings, neighborhoods) para empezar de cero.
 * Usa TRUNCATE (reinicia contadores autoincrement).
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

function mysqlUrlLooksLocal(url) {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('0.0.0.0')
  )
}

async function truncateAll(prisma) {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `listings`')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `neighborhoods`')
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1')
}

async function main() {
  if (mode !== 'local' && mode !== 'production') {
    console.error('Uso: node scripts/wipe-database.js <local|production>')
    process.exit(1)
  }

  if (mode === 'local') {
    loadEnvLocal()
    const url = process.env.DATABASE_URL || ''
    if (!url.startsWith('mysql://')) {
      console.error('❌ DATABASE_URL no definida o no es mysql:// (revisá .env.development.local)')
      process.exit(1)
    }
    if (!mysqlUrlLooksLocal(url)) {
      console.error('❌ Modo local: DATABASE_URL debe apuntar a MySQL en localhost (no uses la URL de producción).')
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
    if (!url.startsWith('mysql://')) {
      console.error('❌ DATABASE_URL en .env.production no es válida')
      process.exit(1)
    }
    if (mysqlUrlLooksLocal(url)) {
      console.error('❌ La URL en .env.production parece local. Revisá el archivo antes de vaciar.')
      process.exit(1)
    }
  }

  const prisma = new PrismaClient()
  try {
    console.log(mode === 'local' ? '🗑️  Vaciando base LOCAL...' : '🗑️  Vaciando base de PRODUCCIÓN...')
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
