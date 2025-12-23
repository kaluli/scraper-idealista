/**
 * Script para importar JSON y actualizar registros con links erróneos de 3 dígitos
 * 
 * Uso:
 * node scripts/update-3digit-links.js pisos_santa_eulalia.json
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Función para extraer el ID del link
function extractLinkId(link) {
  if (!link) return null
  const match = link.match(/\/inmueble\/(\d+)\//)
  return match ? match[1] : null
}

// Función para verificar si un link tiene 3 dígitos
function is3DigitLink(link) {
  const id = extractLinkId(link)
  return id && id.length === 3
}

// Función para normalizar dirección para comparación
function normalizeAddress(address) {
  if (!address) return ''
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
}

// Función para encontrar registro existente con link de 3 dígitos que coincida
async function findMatching3DigitListing(data) {
  // Buscar todos los registros con links de 3 dígitos
  const allListings = await prisma.listing.findMany({
    where: {
      link: {
        contains: '/inmueble/'
      }
    }
  })

  // Filtrar los que tienen 3 dígitos
  const threeDigitListings = allListings.filter(listing => is3DigitLink(listing.link))

  // Normalizar datos del JSON para comparación
  const normalizedAddress = normalizeAddress(data.direccion_publicada || data.publishedAddress)
  const price = data.precio_mensual_eur || data.precio_eur_mes || data.precio || 0
  const surface = data.m2 || data.metros_cuadrados || data.surface || null
  const rooms = data.habitaciones !== undefined ? data.habitaciones : null

  // Buscar coincidencias
  for (const listing of threeDigitListings) {
    const listingAddress = normalizeAddress(listing.publishedAddress)
    const addressMatch = normalizedAddress && listingAddress && 
                         (listingAddress.includes(normalizedAddress) || 
                          normalizedAddress.includes(listingAddress))
    
    const priceMatch = Math.abs(listing.price - price) < 0.01
    const surfaceMatch = !surface || !listing.surface || Math.abs(listing.surface - surface) < 1
    const roomsMatch = rooms === null || listing.rooms === null || listing.rooms === rooms

    // Si hay coincidencia en dirección y precio, es probablemente el mismo
    if (addressMatch && priceMatch && surfaceMatch && roomsMatch) {
      return listing
    }
  }

  return null
}

async function importOrUpdateListing(data) {
  try {
    // Si el link es null, no importamos
    if (!data.link) {
      console.log(`⚠️  Link nulo, omitido: ${data.direccion_publicada || 'sin dirección'}`)
      return { skipped: true, reason: 'null_link' }
    }

    // Verificar si el piso ya existe por su link (nuevo link correcto)
    const existingByLink = await prisma.listing.findFirst({
      where: { link: data.link },
    })

    if (existingByLink) {
      console.log(`⚠️  Ya existe con este link: ${data.link} (omitido)`)
      return { skipped: true, reason: 'duplicate_link', link: data.link }
    }

    // Buscar si hay un registro con link de 3 dígitos que coincida
    const matching3Digit = await findMatching3DigitListing(data)

    if (matching3Digit) {
      // Actualizar el registro existente con el nuevo link
      const price = data.precio_mensual_eur || data.precio_eur_mes || data.precio || 0
      const surface = data.m2 || data.metros_cuadrados || data.surface || null
      
      // Normalizar barrio y ciudad
      let neighborhood = data.barrio || data.neighborhood || null
      let city = data.ciudad || data.city || null
      
      if (neighborhood && neighborhood.includes(',')) {
        const parts = neighborhood.split(',').map(p => p.trim())
        if (parts.length > 1) {
          neighborhood = parts[0].trim()
          city = parts[parts.length - 1].trim()
        }
      }
      
      if (neighborhood) {
        if (neighborhood.includes('Juan Carlos I') || neighborhood.includes('Juan de Borbón') || neighborhood.includes('Avenida de Europa')) {
          neighborhood = 'Juan Carlos I (Juan de Borbón)'
        } else if (neighborhood.includes('Santa Eulalia') || neighborhood.includes('Centro – Santa Eulalia')) {
          neighborhood = 'Centro – Santa Eulalia'
        } else if (neighborhood.includes('Espinardo') || neighborhood.includes('Pedanías Norte')) {
          neighborhood = 'Espinardo'
        }
      }

      const updated = await prisma.listing.update({
        where: { id: matching3Digit.id },
        data: {
          link: data.link,
          neighborhood: neighborhood || matching3Digit.neighborhood,
          publishedAddress: data.direccion_publicada || data.publishedAddress || matching3Digit.publishedAddress,
          price: price || matching3Digit.price,
          surface: surface ? parseFloat(surface) : matching3Digit.surface,
          rooms: data.habitaciones !== undefined ? (data.habitaciones === null ? null : parseInt(data.habitaciones)) : matching3Digit.rooms,
          type: (data.precio_mensual_eur || data.precio_eur_mes) ? 'alquiler' : 'compra',
          title: data.titulo || data.title || matching3Digit.title,
          city: city || matching3Digit.city,
          province: data.province || matching3Digit.province || 'Murcia',
          profitabilityRate: data.tasa_rentabilidad || data.profitabilityRate || matching3Digit.profitabilityRate,
        },
      })
      
      console.log(`🔄 Actualizado: ${matching3Digit.link} → ${data.link}`)
      return { updated: true, oldLink: matching3Digit.link, newLink: data.link }
    }

    // Si no hay coincidencia, crear nuevo registro
    const price = data.precio_mensual_eur || data.precio_eur_mes || data.precio || 0
    const surface = data.m2 || data.metros_cuadrados || data.surface || null
    
    // Normalizar barrio y ciudad
    let neighborhood = data.barrio || data.neighborhood || null
    let city = data.ciudad || data.city || null
    
    if (neighborhood && neighborhood.includes(',')) {
      const parts = neighborhood.split(',').map(p => p.trim())
      if (parts.length > 1) {
        neighborhood = parts[0].trim()
        city = parts[parts.length - 1].trim()
      }
    }
    
    if (neighborhood) {
      if (neighborhood.includes('Juan Carlos I') || neighborhood.includes('Juan de Borbón') || neighborhood.includes('Avenida de Europa')) {
        neighborhood = 'Juan Carlos I (Juan de Borbón)'
      } else if (neighborhood.includes('Santa Eulalia') || neighborhood.includes('Centro – Santa Eulalia')) {
        neighborhood = 'Centro – Santa Eulalia'
      } else if (neighborhood.includes('Espinardo') || neighborhood.includes('Pedanías Norte')) {
        neighborhood = 'Espinardo'
      }
    }

    const listing = await prisma.listing.create({
      data: {
        link: data.link,
        neighborhood: neighborhood,
        publishedAddress: data.direccion_publicada || data.publishedAddress || null,
        price: price,
        surface: surface ? parseFloat(surface) : null,
        rooms: data.habitaciones !== undefined ? (data.habitaciones === null ? null : parseInt(data.habitaciones)) : null,
        type: (data.precio_mensual_eur || data.precio_eur_mes) ? 'alquiler' : 'compra',
        title: data.titulo || data.title || null,
        city: city,
        province: data.province || 'Murcia',
        profitabilityRate: data.tasa_rentabilidad || data.profitabilityRate || null,
      },
    })
    
    console.log(`✅ Creado: ${listing.link}`)
    return { created: true, link: listing.link }
  } catch (error) {
    console.error(`❌ Error procesando ${data.link || data.direccion_publicada}:`, error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('❌ Error: Debes especificar el archivo JSON')
    console.log('Uso: node scripts/update-3digit-links.js <archivo.json>')
    process.exit(1)
  }

  const filePath = path.resolve(args[0])
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: El archivo ${filePath} no existe`)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const jsonData = JSON.parse(fileContent)

  if (!Array.isArray(jsonData)) {
    console.error('❌ Error: El JSON debe ser un array')
    process.exit(1)
  }

  console.log(`📦 Procesando ${jsonData.length} pisos...`)
  console.log()

  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of jsonData) {
    const result = await importOrUpdateListing(item)
    
    if (result && result.created) {
      created++
    } else if (result && result.updated) {
      updated++
    } else {
      skipped++
    }
  }

  console.log()
  console.log(`✅ Procesamiento completado:`)
  console.log(`   - Creados: ${created}`)
  console.log(`   - Actualizados: ${updated}`)
  console.log(`   - Omitidos: ${skipped}`)
  console.log(`   - Total procesados: ${jsonData.length}`)
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

