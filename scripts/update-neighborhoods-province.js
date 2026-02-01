/**
 * Script para asociar todos los barrios a Murcia
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📦 Actualizando barrios con provincia Murcia...')
  console.log()

  try {
    const result = await prisma.neighborhood.updateMany({
      where: {},
      data: {
        province: 'Murcia',
      },
    })

    console.log(`✅ ${result.count} barrios actualizados con provincia Murcia`)
    console.log()

    // Mostrar todos los barrios
    const neighborhoods = await prisma.neighborhood.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    console.log('Barrios actualizados:')
    neighborhoods.forEach((n) => {
      console.log(`  - ${n.name} → ${n.province}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


