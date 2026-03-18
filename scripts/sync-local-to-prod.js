#!/usr/bin/env node
/**
 * Sync LOCAL → PRODUCCIÓN (copia toda la base local a producción).
 * - LEE solo de la base local (localhost).
 * - ESCRIBE en la base de producción (FreeDB).
 * - Reemplaza todos los datos en producción con los de local.
 *
 * Requiere:
 *   .env.development.local  → DATABASE_URL local (localhost)
 *   .env.production         → DATABASE_URL de producción (FreeDB)
 *
 * Uso: node scripts/sync-local-to-prod.js
 *  o:  npm run db:sync-to-prod
 */

const path = require('path')
const fs = require('fs')

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      env[key] = val
    }
  })
  return env
}

const root = path.resolve(__dirname, '..')
const prodEnv = readEnvFile(path.join(root, '.env.production'))
const devEnv = readEnvFile(path.join(root, '.env.development.local'))

const localUrl = (devEnv.DATABASE_URL || '').trim()
const prodUrl = (prodEnv.DATABASE_URL || '').trim()

if (!localUrl || !localUrl.startsWith('mysql://')) {
  console.error('❌ Falta DATABASE_URL local en .env.development.local')
  process.exit(1)
}
if (!localUrl.includes('localhost') && !localUrl.includes('127.0.0.1')) {
  console.error('❌ .env.development.local debe ser MySQL local (localhost).')
  process.exit(1)
}
if (!prodUrl || !prodUrl.startsWith('mysql://')) {
  console.error('❌ Falta DATABASE_URL de producción en .env.production')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } })
const prismaProd = new PrismaClient({ datasources: { db: { url: prodUrl } } })

async function main() {
  console.log('📤 Sync LOCAL → PRODUCCIÓN (copia base local a producción)\n')

  let listings = []
  let neighborhoods = []

  try {
    console.log('   Leyendo desde local (localhost)...')
    const [l, n] = await Promise.all([
      prismaLocal.listing.findMany({ orderBy: { id: 'asc' } }),
      prismaLocal.neighborhood.findMany({ orderBy: { id: 'asc' } }),
    ])
    listings = l
    neighborhoods = n
    await prismaLocal.$disconnect()
    console.log('   Listings:', listings.length)
    console.log('   Neighborhoods:', neighborhoods.length)
  } catch (e) {
    await prismaLocal.$disconnect().catch(() => {})
    console.error('❌ Error leyendo local:', e.message)
    process.exit(1)
  }

  try {
    console.log('\n   Escribiendo en producción...')
    await prismaProd.$transaction(async (tx) => {
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) {
        await tx.neighborhood.createMany({ data: neighborhoods })
      }
      if (listings.length) {
        await tx.listing.createMany({ data: listings })
      }
    })
    await prismaProd.$disconnect()
    console.log('   ✅ Producción actualizada con los datos locales.')
  } catch (e) {
    await prismaProd.$disconnect().catch(() => {})
    console.error('❌ Error escribiendo en producción:', e.message)
    process.exit(1)
  }

  console.log('\n✅ Sync listo. La base de producción tiene la misma información que local.\n')
}

main()
