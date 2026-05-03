#!/usr/bin/env node
/**
 * Comprueba la conexión a la base de datos LOCAL (Postgres / Neon).
 */

const path = require('path')
const fs = require('fs')

function loadEnvLocalOnly() {
  const root = path.resolve(__dirname, '..')
  for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    const p = path.join(root, name)
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          if (process.env[key] === undefined || process.env[key] === '') {
            let val = match[2].trim()
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
            process.env[key] = val
          }
        }
      })
    }
  }
}

loadEnvLocalOnly()

const url = process.env.DATABASE_URL
const isPg =
  url &&
  (url.startsWith('postgres://') || url.startsWith('postgresql://'))

if (!isPg) {
  console.error('❌ No hay DATABASE_URL postgresql:// para local.')
  console.error('')
  console.error('Creá .env.development.local con la connection string de Neon (rama dev).')
  process.exit(1)
}

if (url.includes('freedb.tech')) {
  console.error('❌ DATABASE_URL apunta a FreeDB.')
  console.error('   Para desarrollo usá Neon o Postgres local.')
  process.exit(1)
}

console.log('🔗 Comprobando conexión local:', url.replace(/:[^:@]+@/, ':****@'))
console.log('')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    const n = await prisma.listing.count()
    const m = await prisma.neighborhood.count()
    console.log('✅ Conexión local OK.')
    console.log('   Listings:', n, '| Barrios:', m)
  } catch (e) {
    console.error('❌ No se pudo conectar a la base local.')
    console.error('   Error:', e.message)
    console.error('')
    console.error('Revisá:')
    console.error('  1. Que DATABASE_URL en .env.development.local sea postgresql://… (Neon)')
    console.error('  2. npx prisma db push   (crear tablas en la rama)')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
