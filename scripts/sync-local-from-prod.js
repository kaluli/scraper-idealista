#!/usr/bin/env node
/**
 * Copia PRODUCCIÓN → LOCAL únicamente (nunca al revés).
 * Equivalencias npm: db:sync-from-prod | db:prod-to-local
 *
 * - LEE solo producción (.env.production): MySQL o PostgreSQL.
 * - ESCRIBE solo local (.env.development.local): PostgreSQL.
 * - NO modifica producción.
 *
 * Esquema local “vale” para usuarios (tabla users): NO se borra ni modifica.
 * Sí se reemplazan listings + neighborhoods con los de prod.
 * Los estados por usuario (user_listing_states: citas, notas, ocultar…) se vacían
 * porque los IDs de listings cambian al sincronizar — hay que volver a cargarlos en la app.
 *
 * DATABASE_URL producción (primer valor encontrado):
 *   SYNC_PROD_DATABASE_URL → .env.sync.vercel.prod → .env.production(.local) → …
 * DATABASE_URL local: SYNC_LOCAL_DATABASE_URL → .env.development.local → .env.local
 *
 * Flujo automático: npm run db:sync (pull Vercel + este script).
 */

const path = require('path')
const fs = require('fs')
const {
  listingRowForLocal,
  neighborhoodRowForLocal,
} = require('./lib/listing-row-for-local')

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

function mapMysqlListing(row) {
  return listingRowForLocal({
    id: row.id,
    title: row.title,
    price: row.price,
    surface: row.metros_cuadrados,
    link: row.link,
    profitabilityRate: row.tasa_rentabilidad,
    type: row.type,
    neighborhood: row.barrio,
    city: row.city,
    province: row.province,
    publishedAddress: row.direccion_publicada,
    rooms: row.habitaciones,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function mapMysqlNeighborhood(row) {
  return neighborhoodRowForLocal({
    id: row.id,
    name: row.name,
    province: row.province,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

async function readFromMysql(mysqlUrl) {
  const mysql = require('mysql2/promise')
  const conn = await mysql.createConnection(mysqlUrl)
  try {
    const [listRows] = await conn.query(
      'SELECT * FROM listings ORDER BY id ASC'
    )
    const [nhRows] = await conn.query(
      'SELECT * FROM neighborhoods ORDER BY id ASC'
    )
    return {
      listings: listRows.map(mapMysqlListing),
      neighborhoods: nhRows.map(mapMysqlNeighborhood),
    }
  } finally {
    await conn.end()
  }
}

const root = path.resolve(__dirname, '..')

function resolveProdDatabaseUrl() {
  const fromEnv = (process.env.SYNC_PROD_DATABASE_URL || '').trim()
  if (fromEnv) return fromEnv
  const chain = [
    '.env.sync.vercel.prod',
    '.env.production.local',
    '.env.production',
    '.env.vercel.pulled',
  ]
  for (const name of chain) {
    const env = readEnvFile(path.join(root, name))
    const u = (env.DATABASE_URL || '').trim()
    if (u) return u
  }
  return ''
}

function resolveLocalDatabaseUrl() {
  const fromEnv = (process.env.SYNC_LOCAL_DATABASE_URL || '').trim()
  if (fromEnv) return fromEnv
  const dev = readEnvFile(path.join(root, '.env.development.local'))
  const loc = readEnvFile(path.join(root, '.env.local'))
  return (dev.DATABASE_URL || loc.DATABASE_URL || '').trim()
}

const prodUrl = resolveProdDatabaseUrl()
const localUrl = resolveLocalDatabaseUrl()

const localIsPg =
  localUrl.startsWith('postgresql://') || localUrl.startsWith('postgres://')

if (!prodUrl) {
  console.error(
    '❌ Falta DATABASE_URL de producción. Opciones:\n' +
      '   • Ejecutá npm run db:sync (descarga vars desde Vercel)\n' +
      '   • O SYNC_PROD_DATABASE_URL, .env.production, .env.sync.vercel.prod'
  )
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

if (!localUrl || !localIsPg) {
  console.error(
    '❌ Falta DATABASE_URL local en .env.development.local (postgresql://…)'
  )
  process.exit(1)
}

const localOk =
  localUrl.includes('localhost') ||
  localUrl.includes('127.0.0.1') ||
  localUrl.includes('neon.tech')
if (!localOk) {
  console.error(
    '❌ Local debe ser Postgres en localhost, 127.0.0.1 o una rama (*.neon.tech).'
  )
  process.exit(1)
}

if (prodUrl === localUrl) {
  console.error('❌ Producción y local tienen la misma DATABASE_URL.')
  process.exit(1)
}

const prodIsMysql = prodUrl.startsWith('mysql://')
const prodIsPg =
  prodUrl.startsWith('postgresql://') || prodUrl.startsWith('postgres://')

if (!prodIsMysql && !prodIsPg) {
  console.error(
    '❌ Producción debe ser mysql:// o postgresql:// (revisá .env.production)'
  )
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')

async function main() {
  console.log(
    '📥 Sync LOCAL ← PRODUCCIÓN (solo lectura en prod, escritura solo en local)\n'
  )

  let listings = []
  let neighborhoods = []

  try {
    console.log('   Leyendo desde producción...')
    if (prodIsMysql) {
      const data = await readFromMysql(prodUrl)
      listings = data.listings
      neighborhoods = data.neighborhoods
    } else {
      const prismaProd = new PrismaClient({
        datasources: { db: { url: prodUrl } },
      })
      try {
        ;[listings, neighborhoods] = await Promise.all([
          prismaProd.listing.findMany({ orderBy: { id: 'asc' } }),
          prismaProd.neighborhood.findMany({ orderBy: { id: 'asc' } }),
        ])
        listings = listings.map((r) => listingRowForLocal(r))
        neighborhoods = neighborhoods.map((r) => neighborhoodRowForLocal(r))
      } finally {
        await prismaProd.$disconnect()
      }
    }
    console.log('   Listings:', listings.length)
    console.log('   Neighborhoods:', neighborhoods.length)
  } catch (e) {
    console.error('❌ Error leyendo producción:', e.message)
    process.exit(1)
  }

  const prismaLocal = new PrismaClient({
    datasources: { db: { url: localUrl } },
  })

  try {
    console.log(
      '\n   Escribiendo en local (Postgres): usuarios intactos; vaciando estados por listing…'
    )
    await prismaLocal.$transaction(async (tx) => {
      await tx.userListingState.deleteMany({})
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) {
        await tx.neighborhood.createMany({ data: neighborhoods })
      }
      if (listings.length) {
        await tx.listing.createMany({ data: listings })
      }
    })
    await prismaLocal.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1))
    `)
    await prismaLocal.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('neighborhoods', 'id'), COALESCE((SELECT MAX(id) FROM neighborhoods), 1))
    `)
    console.log('   ✅ Local actualizado con los datos de producción.')
  } catch (e) {
    console.error('❌ Error escribiendo en local:', e.message)
    process.exit(1)
  } finally {
    await prismaLocal.$disconnect()
  }

  console.log(
    '\n✅ Sync listo: listings y barrios como en prod; users sin tocar; citas/notas por usuario reseteadas.\n'
  )
}

main()
