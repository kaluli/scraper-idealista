#!/usr/bin/env node
/**
 * Corrige el piso de 184.750€ en producción: province = Madrid.
 * Así aparece en Contactos y en la página principal.
 *
 * Uso: node scripts/fix-piso-184750-prod.js
 */

const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.production')

if (!fs.existsSync(envPath)) {
  console.error('❌ No existe .env.production')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
content.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    process.env[key] = val
  }
})

const prisma = new PrismaClient()

async function main() {
  const listing = await prisma.listing.findFirst({
    where: { link: { contains: '110472010' } },
  })

  if (!listing) {
    console.error('❌ No se encontró el piso (link 110472010)')
    process.exit(1)
  }

  if (listing.province === 'Madrid') {
    console.log('✅ El piso ya tiene province = Madrid. Nada que hacer.')
    await prisma.$disconnect()
    return
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      province: 'Madrid',
      neighborhood: listing.neighborhood === 'venta en Reyes Católicos' ? 'Reyes Católicos' : listing.neighborhood,
      city: listing.city === 'venta en Reyes Católicos' ? 'Alcalá de Henares' : listing.city,
    },
  })

  console.log('✅ Piso actualizado en producción:')
  console.log('   province: Madrid')
  console.log('   neighborhood:', listing.neighborhood === 'venta en Reyes Católicos' ? 'Reyes Católicos' : listing.neighborhood)
  console.log('   city:', listing.city === 'venta en Reyes Católicos' ? 'Alcalá de Henares' : listing.city)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
