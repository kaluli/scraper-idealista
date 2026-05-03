#!/usr/bin/env node
/**
 * Copia datos desde una base MySQL (origen) hacia PostgreSQL / Neon (destino).
 * El cliente Prisma ya es PostgreSQL: el origen MySQL se lee con mysql2.
 *
 * Requisitos:
 *   - Esquema creado en Neon: npx prisma db push   (con DATABASE_URL apuntando a Neon)
 *   - Variable MIGRATE_MYSQL_URL con la URL mysql://... de origen (local o backup de prod)
 *
 * Uso:
 *   MIGRATE_MYSQL_URL="mysql://user:pass@host:3306/db" DATABASE_URL="postgresql://..." npx prisma generate && node scripts/migrate-mysql-to-neon.js
 *
 * O cargá DATABASE_URL en .env.development.local y exportá solo MIGRATE_MYSQL_URL.
 */

const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) continue
  fs.readFileSync(p, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) return
      const key = m[1].trim()
      let val = m[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      if (process.env[key] === undefined || process.env[key] === '') process.env[key] = val
    })
}

const mysqlUrl = (process.env.MIGRATE_MYSQL_URL || '').trim()
const pgUrl = (process.env.DATABASE_URL || '').trim()

if (!mysqlUrl.startsWith('mysql://')) {
  console.error('❌ Definí MIGRATE_MYSQL_URL=mysql://usuario:pass@host:3306/base')
  process.exit(1)
}

const isPg =
  pgUrl.startsWith('postgresql://') || pgUrl.startsWith('postgres://')
if (!isPg) {
  console.error(
    '❌ DATABASE_URL debe ser postgresql://... (Neon). Ejecutá antes: npx prisma db push'
  )
  process.exit(1)
}

function mapListing(row) {
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

function mapNeighborhood(row) {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

async function fetchMysql() {
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
      listings: listRows.map(mapListing),
      neighborhoods: nhRows.map(mapNeighborhood),
    }
  } finally {
    await conn.end()
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: { db: { url: pgUrl } },
})

async function main() {
  console.log('📥 Migración MySQL → PostgreSQL (Neon)\n')
  console.log('   Origen:', mysqlUrl.replace(/:[^:@]+@/, ':****@'))
  console.log('   Destino:', pgUrl.replace(/:[^:@]+@/, ':****@'))
  console.log('')

  let listings
  let neighborhoods
  try {
    console.log('   Leyendo tablas desde MySQL...')
    const data = await fetchMysql()
    listings = data.listings
    neighborhoods = data.neighborhoods
    console.log('   Listings:', listings.length, '| Neighborhoods:', neighborhoods.length)
  } catch (e) {
    console.error('❌ Error leyendo MySQL:', e.message)
    process.exit(1)
  }

  try {
    console.log('\n   Escribiendo en PostgreSQL...')
    await prisma.$transaction(async (tx) => {
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) {
        await tx.neighborhood.createMany({ data: neighborhoods })
      }
      if (listings.length) {
        await tx.listing.createMany({ data: listings })
      }
    })
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1))
    `)
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('neighborhoods', 'id'), COALESCE((SELECT MAX(id) FROM neighborhoods), 1))
    `)
    console.log('✅ Migración completada.')
  } catch (e) {
    console.error('❌ Error escribiendo en PostgreSQL:', e.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
