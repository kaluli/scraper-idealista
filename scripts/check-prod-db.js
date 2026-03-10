#!/usr/bin/env node
/**
 * Comprueba que la base de datos de producción tenga todos los datos.
 * Usa DATABASE_URL de .env.production (si existe) o de .env.local.
 *
 * Para comprobar PROD: poné la URL de FreeDB en .env.production y ejecutá:
 *   node scripts/check-prod-db.js
 *
 * O pasá la URL por variable:
 *   DATABASE_URL="mysql://user:pass@sql.freedb.tech:3306/freedb_scraper" node scripts/check-prod-db.js
 */

const path = require('path')
const fs = require('fs')

function loadEnv() {
  const root = path.resolve(__dirname, '..')
  // .env.production al final para que gane sobre .env.local al comprobar prod
  for (const name of ['.env', '.env.local', '.env.production']) {
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

loadEnv()

const url = process.env.DATABASE_URL
if (!url || !url.startsWith('mysql://')) {
  console.error('❌ No se encontró DATABASE_URL (mysql://...) en .env.production o .env.local')
  process.exit(1)
}

const isProd = url.includes('freedb.tech') || url.includes('freedb.tech')
console.log('🔗 Conectando a:', url.replace(/:[^:@]+@/, ':****@'), '\n')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const [listingsCount, neighborhoodsCount] = await Promise.all([
      prisma.listing.count(),
      prisma.neighborhood.count(),
    ])

    const listingsWithProvince = await prisma.listing.count({
      where: { province: { not: null } },
    })
    const listingsWithNeighborhood = await prisma.listing.count({
      where: { neighborhood: { not: null } },
    })
    const byType = await prisma.listing.groupBy({
      by: ['type'],
      _count: { id: true },
    })
    const provincesInListings = await prisma.listing.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ['province'],
    })
    const provincesInNeighborhoods = await prisma.neighborhood.findMany({
      select: { province: true },
      distinct: ['province'],
    })

    console.log('═══════════════════════════════════════')
    console.log('   RESUMEN BASE DE DATOS (producción)')
    console.log('═══════════════════════════════════════\n')
    console.log('📋 Listings (pisos):', listingsCount)
    console.log('   - Con provincia:', listingsWithProvince)
    console.log('   - Con barrio:', listingsWithNeighborhood)
    console.log('   - Por tipo:', byType.map((x) => `${x.type}: ${x._count.id}`).join(', '))
    console.log('')
    console.log('🏘️  Neighborhoods (barrios):', neighborhoodsCount)
    console.log('')
    console.log('📍 Provincias en listings:', provincesInListings.map((p) => p.province).filter(Boolean).join(', ') || '(ninguna)')
    console.log('📍 Provincias en neighborhoods:', provincesInNeighborhoods.map((p) => p.province).join(', ') || '(ninguna)')
    console.log('')

    if (listingsCount > 0) {
      const sample = await prisma.listing.findMany({
        take: 3,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          price: true,
          province: true,
          neighborhood: true,
          city: true,
        },
      })
      console.log('📄 Muestra de listings (3 últimos):')
      sample.forEach((s, i) => {
        console.log(`   ${i + 1}. id=${s.id} | ${s.type} | ${s.price}€ | prov=${s.province || '-'} | barrio=${s.neighborhood || '-'} | ${(s.title || '').slice(0, 40)}`)
      })
      console.log('')
    }

    if (neighborhoodsCount > 0) {
      const sampleN = await prisma.neighborhood.findMany({
        take: 5,
        orderBy: { name: 'asc' },
        select: { name: true, province: true },
      })
      console.log('📄 Muestra de neighborhoods:')
      sampleN.forEach((n) => console.log(`   - ${n.name} (${n.province})`))
      console.log('')
    }

    const ok = listingsCount > 0
    if (!ok) {
      console.log('⚠️  No hay listings. La página en prod no mostrará pisos hasta que importes datos.')
    } else if (listingsWithProvince === 0) {
      console.log('⚠️  Ningún listing tiene provincia. El filtro de provincias puede quedar vacío o no filtrar bien.')
    } else {
      console.log('✅ La base tiene datos suficientes para que la página muestre provincias y pisos.')
    }
  } catch (e) {
    console.error('❌ Error:', e.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
