#!/usr/bin/env node
/**
 * Añade 2 pisos a Visitas Hechas en producción (Alcobendas MiraFlores).
 * Uso: node scripts/add-pisos-alcobendas-prod.js
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

const PISOS = [
  {
    publishedAddress: 'Alcobendas MiraFlores Barrio Alcobendas',
    title: 'Alcobendas MiraFlores Barrio Alcobendas',
    price: 185000,
    notas: 'Aún no están en Idealista',
    link: 'https://www.idealista.com/sin-enlace-1',
  },
  {
    publishedAddress: 'Alcobendas MiraFlores Barrio Alcobendas',
    title: 'Alcobendas MiraFlores Barrio Alcobendas',
    price: 190000,
    notas: 'Aún no están en Idealista',
    link: 'https://www.idealista.com/sin-enlace-2',
  },
]

async function main() {
  console.log('📥 Añadiendo 2 pisos en producción (Visitas Hechas)...\n')

  for (const p of PISOS) {
    const existing = await prisma.listing.findFirst({
      where: { link: p.link },
    })
    if (existing) {
      console.log('   ⏭️  Ya existe:', p.price, '€')
      continue
    }
    await prisma.listing.create({
      data: {
        link: p.link,
        title: p.title,
        publishedAddress: p.publishedAddress,
        price: p.price,
        type: 'compra',
        province: 'Madrid',
        neighborhood: 'Alcobendas',
        city: 'Alcobendas',
      },
    })
    console.log('   ✅ Añadido:', p.price, '€ -', p.publishedAddress)
  }

  await prisma.$disconnect()
  console.log('\n✅ Listo.')
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
