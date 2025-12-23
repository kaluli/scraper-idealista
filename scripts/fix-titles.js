/**
 * Script para corregir títulos faltantes o "sin titulo"
 * Usa el campo direccion_publicada para reemplazar el título
 * 
 * Uso:
 * node scripts/fix-titles.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixTitles() {
  try {
    console.log('🔍 Buscando pisos sin título o con "sin titulo"...\n')

    // Buscar TODOS los listings que tienen dirección publicada
    const allListings = await prisma.listing.findMany({
      where: {
        publishedAddress: {
          not: null,
        },
      },
    })

    // Filtrar los que necesitan corrección - los que tienen "Sin Titulo" o están vacíos
    const listingsToFix = allListings.filter((listing) => {
      // Si no tiene dirección, no se puede actualizar
      if (!listing.publishedAddress || listing.publishedAddress.trim() === '') {
        return false
      }
      // Si no tiene título o está vacío, necesita corrección
      if (!listing.title || listing.title.trim() === '') {
        return true
      }
      // Si tiene "Sin Titulo" en cualquier variación, necesita corrección
      const titleLower = listing.title.toLowerCase()
      const titleOriginal = listing.title
      return (
        titleLower.includes('sin titulo') ||
        titleLower.includes('sin título') ||
        titleOriginal.includes('Sin Titulo') ||
        titleOriginal.includes('Sin título') ||
        titleOriginal === 'Sin Titulo' ||
        titleOriginal === 'Sin título'
      )
    })

    console.log(`📋 Encontrados ${listingsToFix.length} pisos para corregir\n`)

    if (listingsToFix.length === 0) {
      console.log('✅ No hay pisos que corregir')
      return
    }

    let updated = 0
    let skipped = 0

    for (const listing of listingsToFix) {
      if (!listing.publishedAddress || listing.publishedAddress.trim() === '') {
        console.log(`⚠️  Sin dirección: ${listing.link} (omitido)`)
        skipped++
        continue
      }

      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            title: listing.publishedAddress.trim(),
          },
        })
        console.log(`✅ Actualizado: ${listing.link}`)
        console.log(`   Título: "${listing.publishedAddress.trim()}"`)
        updated++
      } catch (error) {
        console.error(`❌ Error actualizando ${listing.link}:`, error.message)
        skipped++
      }
    }

    console.log('\n✅ Corrección completada:')
    console.log(`   - Actualizados: ${updated}`)
    console.log(`   - Omitidos: ${skipped}`)
    console.log(`   - Total procesados: ${listingsToFix.length}`)
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

async function main() {
  try {
    await fixTitles()
  } catch (error) {
    console.error('Error fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

