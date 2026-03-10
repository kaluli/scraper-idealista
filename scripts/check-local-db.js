#!/usr/bin/env node
/**
 * Comprueba la conexión a la base de datos LOCAL.
 * Solo carga .env y .env.local (igual que "npm run dev").
 * Si falla o estás apuntando a FreeDB, te dice qué poner en .env.local.
 *
 * Uso: node scripts/check-local-db.js
 */

const path = require('path')
const fs = require('fs')

function loadEnvLocalOnly() {
  const root = path.resolve(__dirname, '..')
  // Mismo orden que Next.js en dev: .env, .env.local, .env.development, .env.development.local
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
if (!url || !url.startsWith('mysql://')) {
  console.error('❌ No hay DATABASE_URL para local.')
  console.error('')
  console.error('Creá .env.development.local a partir de .env.development.local.example:')
  console.error('  cp .env.development.local.example .env.development.local')
  console.error('y poné tu MySQL local (localhost). Ver ENTORNOS.md.')
  process.exit(1)
}

if (url.includes('freedb.tech')) {
  console.error('❌ Tenés la URL de FreeDB en un archivo de desarrollo.')
  console.error('   Para local usá SOLO .env.development.local con MySQL en localhost.')
  console.error('   Ver ENTORNOS.md.')
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
    console.error('  1. Que MySQL esté corriendo (en Mac: brew services start mysql)')
    console.error('  2. Que la base exista: mysql -u root -e "CREATE DATABASE IF NOT EXISTS idealista_db;"')
    console.error('  3. Que en .env.local tengas: DATABASE_URL="mysql://root@localhost:3306/idealista_db"')
    console.error('     (o con contraseña si la tiene: mysql://root:password@localhost:3306/idealista_db)')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
