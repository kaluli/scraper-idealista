/**
 * Seed script: añade la provincia Madrid y los 21 distritos/barrios de Madrid
 * que utiliza Idealista en sus listados.
 *
 * Uso: node scripts/seed-madrid-neighborhoods.js
 *
 * Requiere: DATABASE_URL en .env
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 21 distritos de Madrid capital + municipios de la Comunidad de Madrid (Idealista)
const MADRID_NEIGHBORHOODS = [
  // Distritos de la ciudad de Madrid
  'Centro',
  'Arganzuela',
  'Retiro',
  'Salamanca',
  'Chamartín',
  'Tetuán',
  'Chamberí',
  'Fuencarral-El Pardo',
  'Moncloa-Aravaca',
  'Latina',
  'Carabanchel',
  'Usera',
  'Puente de Vallecas',
  'Villa de Vallecas',
  'Villaverde',
  'Ciudad Lineal',
  'Hortaleza',
  'Barajas',
  'Moratalaz',
  'San Blas-Canillejas',
  'Vicálvaro',
  // Municipios de la Comunidad de Madrid
  'Alcalá de Henares',
]

const PROVINCE = 'Madrid'

async function seedMadrid() {
  try {
    console.log('🏙️  Añadiendo Madrid y barrios de Madrid (Idealista)...\n')

    let created = 0
    let skipped = 0

    for (const name of MADRID_NEIGHBORHOODS) {
      try {
        await prisma.neighborhood.upsert({
          where: {
            province_name: { province: PROVINCE, name },
          },
          create: { province: PROVINCE, name },
          update: {},
        })
        created++
        console.log(`  ✅ ${name}`)
      } catch (e) {
        if (e.code === 'P2002') {
          skipped++
          console.log(`  ⏭️  ${name} (ya existe)`)
        } else {
          throw e
        }
      }
    }

    console.log(`\n📊 Resultado: ${created} barrios creados, ${skipped} ya existían.`)
    console.log('✅ Madrid y sus barrios están disponibles en los filtros.\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedMadrid()
