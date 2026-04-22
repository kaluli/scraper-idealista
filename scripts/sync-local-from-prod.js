#!/usr/bin/env node
/**
 * Backup / copia PRODUCCIÓN → LOCAL (no al revés).
 * Equivalencias npm: db:sync-from-prod | db:prod-to-local
 *
 * - LEE solo de la base de producción (MySQL remoto desde .env.production).
 * - ESCRIBE solo en la base local (localhost): listings + neighborhoods.
 * - La web en local (incl. /contactos) usa esa BD local; tras este sync coincide con prod.
 * - NO modifica nunca la base de producción.
 * - NO escribe ni cambia process.env ni ningún archivo .env (solo LEE las URLs).
 *
 * Requiere:
 *   .env.production           → DATABASE_URL de producción (MySQL remoto)
 *   .env.development.local    → DATABASE_URL local (localhost)
 *
 * Uso: node scripts/sync-local-from-prod.js
 *  o:  npm run db:sync-from-prod
 *
 * Si "Can't reach database server" a FreeDB: usá npm run db:pull-vercel
 * (mismo dato vía GET /api/admin/export, sin puerto 3306).
 */

const path = require('path')
const fs = require('fs')

// Solo lee variables de un archivo; NUNCA escribe en process.env ni en archivos
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

const prodUrl = (prodEnv.DATABASE_URL || '').trim()
const localUrl = (devEnv.DATABASE_URL || '').trim()

if (!prodUrl || !prodUrl.startsWith('mysql://')) {
  console.error('❌ Falta DATABASE_URL de producción en .env.production')
  process.exit(1)
}
const prodLooksLocal =
  prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')
if (prodLooksLocal) {
  console.error(
    '❌ .env.production no debe ser localhost: ahí va la URL de PRODUCCIÓN remota.'
  )
  process.exit(1)
}
if (prodUrl === localUrl) {
  console.error('❌ Producción y local tienen la misma DATABASE_URL.')
  process.exit(1)
}
if (!localUrl || !localUrl.startsWith('mysql://')) {
  console.error('❌ Falta DATABASE_URL local en .env.development.local')
  process.exit(1)
}
if (!localUrl.includes('localhost') && !localUrl.includes('127.0.0.1')) {
  console.error('❌ .env.development.local debe ser MySQL local (localhost).')
  process.exit(1)
}

// Usamos las URLs leídas de los archivos; Prisma no usa process.env.DATABASE_URL aquí
const { PrismaClient } = require('@prisma/client')
const prismaProd = new PrismaClient({ datasources: { db: { url: prodUrl } } })
const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } })

async function main() {
  console.log('📥 Sync LOCAL ← PRODUCCIÓN (solo lectura en prod, escritura solo en local)\n')

  let listings = []
  let neighborhoods = []

  try {
    console.log('   Leyendo desde producción...')
    const [l, n] = await Promise.all([
      prismaProd.listing.findMany({ orderBy: { id: 'asc' } }),
      prismaProd.neighborhood.findMany({ orderBy: { id: 'asc' } }),
    ])
    listings = l
    neighborhoods = n
    await prismaProd.$disconnect()
    console.log('   Listings:', listings.length)
    console.log('   Neighborhoods:', neighborhoods.length)
  } catch (e) {
    await prismaProd.$disconnect().catch(() => {})
    console.error('❌ Error leyendo producción:', e.message)
    process.exit(1)
  }

  try {
    console.log('\n   Escribiendo en local (localhost)...')
    await prismaLocal.$transaction(async (tx) => {
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) {
        await tx.neighborhood.createMany({ data: neighborhoods })
      }
      if (listings.length) {
        await tx.listing.createMany({ data: listings })
      }
    })
    await prismaLocal.$disconnect()
    console.log('   ✅ Local actualizado con los datos de producción.')
  } catch (e) {
    await prismaLocal.$disconnect().catch(() => {})
    console.error('❌ Error escribiendo en local:', e.message)
    process.exit(1)
  }

  console.log('\n✅ Sync listo. La base local tiene la misma información que producción.\n')
}

main()
