#!/usr/bin/env node
/**
 * Backup / copia PRODUCCIÓN → LOCAL (no al revés).
 * Equivalencias npm: db:sync-from-prod | db:prod-to-local
 *
 * - LEE solo de la base de producción (.env.production): MySQL o PostgreSQL.
 * - ESCRIBE solo en la base local (.env.development.local): PostgreSQL (Neon u otro).
 * - NO modifica la base de producción.
 *
 * Requiere:
 *   .env.production           → DATABASE_URL de producción
 *   .env.development.local    → DATABASE_URL local (postgresql://…)
 *
 * Uso: node scripts/sync-local-from-prod.js
 *  o:  npm run db:sync-from-prod
 *
 * Si prod sigue en MySQL y el puerto está bloqueado: npm run db:pull-vercel
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

function mapMysqlListing(row) {
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    surface:
      row.metros_cuadrados != null ? Number(row.metros_cuadrados) : null,
    link: row.link,
    profitabilityRate:
      row.tasa_rentabilidad != null ? Number(row.tasa_rentabilidad) : null,
    type: row.type,
    neighborhood: row.barrio,
    city: row.city,
    province: row.province,
    publishedAddress: row.direccion_publicada,
    rooms: row.habitaciones,
    citaAt: row.cita_at ? new Date(row.cita_at) : null,
    contacto: row.contacto,
    phone: row.telefono,
    notas: row.notas,
    llamado: Boolean(row.llamado),
    visitado: Boolean(row.visitado),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapMysqlNeighborhood(row) {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
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
const prodEnv = readEnvFile(path.join(root, '.env.production'))
const devEnv = readEnvFile(path.join(root, '.env.development.local'))

const prodUrl = (prodEnv.DATABASE_URL || '').trim()
const localUrl = (devEnv.DATABASE_URL || '').trim()

const localIsPg =
  localUrl.startsWith('postgresql://') || localUrl.startsWith('postgres://')

if (!prodUrl) {
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
    console.log('\n   Escribiendo en local (Postgres)...')
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
    '\n✅ Sync listo. La base local tiene la misma información que producción.\n'
  )
}

main()
