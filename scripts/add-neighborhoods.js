/**
 * Script para añadir barrios a la base de datos
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const neighborhoods = [
  'La Flota',
  'Juan Carlos I (Juan de Borbón)',
  'Centro – Santa Eulalia',
  'Espinardo',
  'Vistalegre',
  'El Carmen',
  'Pueblo Nuevo',
  'San Lorenzo',
  'San Bartolomé / Centro Histórico',
  'Infante Juan Manuel',
]

async function main() {
  console.log('📦 Añadiendo barrios a la base de datos...')
  console.log()

  for (const name of neighborhoods) {
    try {
      const neighborhood = await prisma.neighborhood.upsert({
        where: { name },
        update: {},
        create: { name },
      })
      console.log(`✅ ${name}`)
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${name} (ya existe)`)
      } else {
        console.error(`❌ Error añadiendo ${name}:`, error.message)
      }
    }
  }

  console.log()
  console.log('✅ Barrios añadidos correctamente')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

