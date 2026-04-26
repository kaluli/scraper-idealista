#!/usr/bin/env node
/**
 * Unifica barrios largos de búsqueda de Idealista (Segovia) en un solo barrio "Segovia".
 * Solo base LOCAL: lee DATABASE_URL de .env.development.local
 *
 * Uso: node scripts/unify-segovia-barrios.js
 */

const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const env = {}
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
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

const devEnv = readEnvFile(path.join(root, '.env.development.local'))
const localUrl = (devEnv.DATABASE_URL || '').trim()
if (!localUrl.startsWith('mysql://') || (!localUrl.includes('localhost') && !localUrl.includes('127.0.0.1'))) {
  console.error('❌ Necesitás DATABASE_URL local en .env.development.local')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } })

const OLD_NAMES = [
  'Casas y pisos en alquiler en Segovia',
  'Casas y pisos hasta 130.000 euros en Segovia',
]
const NEW_NAME = 'Segovia'

async function main() {
  console.log('🏠 Unificar barrios Segovia → "' + NEW_NAME + '" (solo local)\n')

  const before = await prisma.listing.findMany({
    where: { neighborhood: { in: OLD_NAMES } },
    select: { id: true, neighborhood: true, province: true },
  })
  console.log('   Listings afectados (muestra):', before.length)
  if (before.length) {
    const by = {}
    before.forEach((l) => {
      const k = l.neighborhood || ''
      by[k] = (by[k] || 0) + 1
    })
    Object.entries(by).forEach(([k, c]) => console.log(`      ${c}× "${k}"`))
  }

  const listingResult = await prisma.listing.updateMany({
    where: { neighborhood: { in: OLD_NAMES } },
    data: { neighborhood: NEW_NAME },
  })
  console.log('\n   Listings actualizados:', listingResult.count)

  const fromTable = await prisma.neighborhood.findMany({
    where: { name: { in: OLD_NAMES } },
  })
  if (fromTable.length) {
    const byProvince = [...new Set(fromTable.map((n) => n.province))]
    for (const p of byProvince) {
      const existing = await prisma.neighborhood.findFirst({
        where: { province: p, name: NEW_NAME },
      })
      if (!existing) {
        await prisma.neighborhood.create({
          data: { name: NEW_NAME, province: p },
        })
        console.log('   Fila neighborhoods creada:', NEW_NAME, '|', p)
      }
    }
    const del = await prisma.neighborhood.deleteMany({
      where: { name: { in: OLD_NAMES } },
    })
    console.log('   Filas neighborhoods eliminadas (nombres largos):', del.count)
  } else {
    console.log('   Tabla neighborhoods: sin filas con esos nombres (solo listings).')
  }

  const remaining = await prisma.listing.count({
    where: { neighborhood: { in: OLD_NAMES } },
  })
  if (remaining > 0) {
    console.error('\n❌ Aún quedan', remaining, 'listings con nombre largo (revisar).')
    process.exit(1)
  }

  console.log('\n✅ Listo.\n')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().catch(() => {})
  process.exit(1)
})
