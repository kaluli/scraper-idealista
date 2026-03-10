/**
 * Elimina todos los anuncios que son chalets (título contiene "chalet").
 * Uso: node scripts/delete-chalets.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteChalets() {
  const all = await prisma.listing.findMany({
    select: { id: true, title: true, link: true, type: true, neighborhood: true },
  })
  const chalets = all.filter((l) => (l.title || '').toLowerCase().includes('chalet'))

  console.log(`Encontrados ${chalets.length} chalets de ${all.length} anuncios.`)
  if (chalets.length === 0) {
    await prisma.$disconnect()
    return
  }

  for (const l of chalets) {
    console.log(`  Eliminando: ${l.title || l.link} (${l.type}, ${l.neighborhood || '-'})`)
    await prisma.listing.delete({ where: { id: l.id } })
  }
  console.log(`\nEliminados ${chalets.length} chalets.`)
  await prisma.$disconnect()
}

deleteChalets().catch((e) => {
  console.error(e)
  process.exit(1)
})
