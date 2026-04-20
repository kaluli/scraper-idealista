/**
 * Script para importar datos JSON al formato de la base de datos
 * 
 * Uso:
 * node scripts/import-json.js < archivo.json
 * 
 * O con un archivo específico:
 * node scripts/import-json.js archivo.json
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function importListing(data) {
  try {
    // Validar que tenga link (requerido)
    if (!data.link) {
      console.log(`⚠️  Sin link, omitido: ${JSON.stringify(data).substring(0, 50)}...`)
      return { skipped: true, reason: 'Sin link' }
    }

    // Verificar si el piso ya existe por su link
    const existing = await prisma.listing.findFirst({
      where: { link: data.link },
    })

    if (existing) {
      console.log(`⚠️  Ya existe: ${data.link} (omitido)`)
      return { skipped: true, link: data.link }
    }

    // Normalizar campos de precio (múltiples formatos)
    const price = data.precio_mensual_eur || data.precio_eur_mes || data.precio_venta_eur || data.precio_total_eur || data.precio_eur || data.precio || 0
    
    // Normalizar superficie (múltiples formatos)
    const surface = data.m2 || data.metros_cuadrados || data.surface || null
    
    // Normalizar barrio y extraer ciudad si viene en el nombre
    let neighborhood = data.barrio || data.neighborhood || null
    let city = data.ciudad || data.city || null
    
    // Si el barrio incluye la ciudad (ej: "Zona Juan Carlos I - Avenida de Europa, Murcia")
    if (neighborhood && neighborhood.includes(',')) {
      const parts = neighborhood.split(',').map(p => p.trim())
      if (parts.length > 1) {
        neighborhood = parts[0].trim()
        city = parts[parts.length - 1].trim()
      }
    }
    
    // Normalizar nombre del barrio conocido
    if (neighborhood) {
      // Mapear nombres similares al barrio registrado
      if (neighborhood.includes('Juan Carlos I') || neighborhood.includes('Juan de Borbón') || neighborhood.includes('Avenida de Europa')) {
        neighborhood = 'Juan Carlos I (Juan de Borbón)'
      } else if (neighborhood.includes('Santa Eulalia') || neighborhood.includes('Centro – Santa Eulalia')) {
        neighborhood = 'Centro – Santa Eulalia'
      } else if (neighborhood.includes('Espinardo')) {
        neighborhood = 'Espinardo'
      } else if (neighborhood.includes('San Lorenzo')) {
        neighborhood = 'San Lorenzo'
      } else if (neighborhood.includes('Vistalegre')) {
        neighborhood = 'Vistalegre'
      } else if (neighborhood.includes('El Carmen')) {
        neighborhood = 'El Carmen'
      }
    }
    
    // Normalizar datos del formato JSON del scraper
    const listing = await prisma.listing.create({
      data: {
        link: data.link,
        neighborhood: neighborhood,
        publishedAddress: data.direccion_publicada || data.publishedAddress || null,
        price: price,
        surface: surface ? parseFloat(surface) : null,
        rooms: data.habitaciones !== undefined ? (data.habitaciones === null ? null : parseInt(data.habitaciones)) : null,
        type: (data.precio_mensual_eur || data.precio_eur_mes) ? 'alquiler' : (data.precio_venta_eur || data.precio_total_eur ? 'compra' : 'compra'),
        title: data.titulo || data.title || null,
        city: city,
        province: data.province || 'Madrid',
        profitabilityRate: data.tasa_rentabilidad || data.profitabilityRate || null,
      },
    })
    
    console.log(`✅ Importado: ${listing.link}`)
    return listing
  } catch (error) {
    console.error(`❌ Error importando ${data.link}:`, error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  let jsonData

  if (args.length > 0) {
    // Leer desde archivo
    const filePath = path.resolve(args[0])
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    jsonData = JSON.parse(fileContent)
  } else {
    // Leer desde stdin
    let input = ''
    process.stdin.setEncoding('utf8')
    
    for await (const chunk of process.stdin) {
      input += chunk
    }
    
    jsonData = JSON.parse(input)
  }

  // Si es un array, importar cada elemento
  if (Array.isArray(jsonData)) {
    console.log(`📦 Importando ${jsonData.length} pisos...`)
    console.log()
    
    let imported = 0
    let skipped = 0
    
    for (const item of jsonData) {
      const result = await importListing(item)
      if (result && result.skipped) {
        skipped++
      } else {
        imported++
      }
    }
    
    console.log()
    console.log(`✅ Importación completada:`)
    console.log(`   - Importados: ${imported}`)
    console.log(`   - Omitidos (duplicados): ${skipped}`)
    console.log(`   - Total procesados: ${jsonData.length}`)
  } else {
    // Si es un solo objeto
    console.log('📦 Importando 1 piso...')
    const result = await importListing(jsonData)
    if (result && result.skipped) {
      console.log('\n⚠️  Piso ya existe, omitido')
    } else {
      console.log('\n✅ Importación completada')
    }
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

