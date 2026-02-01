/**
 * Script para exportar todos los pisos de la base de datos a JSON
 * 
 * Uso:
 * node scripts/export-to-json.js [archivo_salida.json]
 * 
 * Si no se especifica archivo, exporta a: export_pisos_YYYYMMDD_HHMMSS.json
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function exportListings() {
  try {
    console.log('📤 Exportando pisos de la base de datos...\n')
    
    // Obtener todos los pisos
    const listings = await prisma.listing.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`✅ Encontrados ${listings.length} pisos`)
    
    // Convertir a formato JSON del scraper
    const exportData = listings.map(listing => ({
      link: listing.link,
      barrio: listing.neighborhood || null,
      direccion_publicada: listing.publishedAddress || null,
      precio_eur_mes: listing.type === 'alquiler' ? listing.price : null,
      precio_venta_eur: listing.type === 'compra' ? listing.price : null,
      metros_cuadrados: listing.surface || null,
      habitaciones: listing.rooms || null,
      titulo: listing.title || null,
      ciudad: listing.city || null,
      provincia: listing.province || null,
      tasa_rentabilidad: listing.profitabilityRate || null
    }))
    
    // Determinar nombre del archivo
    const args = process.argv.slice(2)
    let outputFile
    
    if (args.length > 0) {
      outputFile = path.resolve(args[0])
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      outputFile = path.join(process.cwd(), `export_pisos_${timestamp}.json`)
    }
    
    // Escribir archivo
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf-8')
    
    const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(2)
    
    console.log(`\n✅ Exportación completada:`)
    console.log(`   Archivo: ${path.basename(outputFile)}`)
    console.log(`   Tamaño: ${fileSize} KB`)
    console.log(`   Total pisos: ${exportData.length}`)
    console.log(`\n💡 Puedes importar este archivo con:`)
    console.log(`   node scripts/import-json.js ${path.basename(outputFile)}`)
    
  } catch (error) {
    console.error('❌ Error exportando:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

exportListings()


