#!/usr/bin/env node
/**
 * Sync LOCAL → PRODUCCIÓN (copia la base local a producción).
 * - LEE solo de la base local (Neon dev / Postgres local).
 * - ESCRIBE en producción (Neon prod).
 *
 * Requiere:
 *   .env.development.local  → DATABASE_URL local (postgresql://…)
 *   .env.production         → DATABASE_URL de producción (postgresql://…)
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

const isPg = (u) =>
  u.startsWith('postgresql://') || u.startsWith('postgres://')

if (!localUrl || !isPg(localUrl)) {
  console.error('❌ Falta DATABASE_URL local en .env.development.local (postgresql://…)')
  process.exit(1)
}

const localDev =
  localUrl.includes('localhost') ||
  localUrl.includes('127.0.0.1') ||
  localUrl.includes('neon.tech')
if (!localDev) {
  console.error(
    '❌ Local debe ser Postgres en localhost/127.0.0.1 o una rama Neon (*.neon.tech).'
  )
  process.exit(1)
}

if (!prodUrl || !isPg(prodUrl)) {
  console.error('❌ Falta DATABASE_URL de producción en .env.production (postgresql://…)')
  process.exit(1)
}

if (prodUrl === localUrl) {
  console.error('❌ Producción y local tienen la misma DATABASE_URL.')
  process.exit(1)
}

if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
  console.error('❌ La URL de producción no debe ser localhost.')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } })
const prismaProd = new PrismaClient({ datasources: { db: { url: prodUrl } } })

async function main() {
  console.log('📤 Sync LOCAL → PRODUCCIÓN (Postgres)\n')

  let listings = []
  let neighborhoods = []

  try {
    console.log('   Leyendo desde local...')
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
    await prismaProd.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1))
    `)
    await prismaProd.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('neighborhoods', 'id'), COALESCE((SELECT MAX(id) FROM neighborhoods), 1))
    `)
    await prismaProd.$disconnect()
    console.log('   ✅ Producción actualizada con los datos locales.')
  } catch (e) {
    await prismaProd.$disconnect().catch(() => {})
    console.error('❌ Error escribiendo en producción:', e.message)
    process.exit(1)
  }

  console.log(
    '\n✅ Sync listo. La base de producción tiene la misma información que local.\n'
  )
}

main()
