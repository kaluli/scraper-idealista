/**
 * Importa pisos desde una página guardada de Idealista (HTML).
 * Extrae link, título, precio, m², habitaciones y zona desde el <title>.
 *
 * Uso:
 *   node scripts/import-idealista-html.js "ruta/al/archivo.html"
 *   node scripts/import-idealista-html.js   (busca en ~/Downloads "Casas y pisos en Alcalá de Henares, Madrid — idealista.html")
 *
 * Ejemplo:
 *   node scripts/import-idealista-html.js "/Users/karinapangaro/Downloads/Casas y pisos en Alcalá de Henares, Madrid — idealista.html"
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const os = require('os')

const prisma = new PrismaClient()

const BASE_URL = 'https://www.idealista.com'

function parsePrice(str) {
  if (!str) return null
  const cleaned = String(str).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function extractFromTitle(pageTitle) {
  // "Casas y pisos en Alcalá de Henares, Madrid — idealista"
  // "Casas y pisos en alquiler en El Carmen, Murcia — idealista"
  // "Arganzuela — idealista" (solo nombre de zona)
  let zone = null
  let province = 'Madrid'
  const matchEn = pageTitle.match(/\ben\s+(?:alquiler\s+en\s+)?(.+?),\s*([^—]+?)\s*—/i)
  if (matchEn) {
    zone = matchEn[1].trim()
    province = matchEn[2].trim()
  } else {
    const matchSolo = pageTitle.match(/^(.+?)\s*—\s*idealista/i)
    if (matchSolo) zone = matchSolo[1].trim()
  }
  if (zone && /centro\s*madrid/i.test(zone)) zone = 'Centro'
  if (zone && /chamartín/i.test(zone)) zone = 'Chamartín'
  if (zone && /ciudad\s*lineal/i.test(zone)) zone = 'Ciudad Lineal'
  if (zone && /fuencarral/i.test(zone)) zone = 'Fuencarral'
  if (zone && /puente\s*de\s*vallecas/i.test(zone)) zone = 'Puente de Vallecas'
  if (zone && /\blatina\b/i.test(zone)) zone = 'Latina'
  if (zone && /tetuán/i.test(zone)) zone = 'Tetuán'
  // San Blas / San Blas-Canillejas → unificar como Canillejas
  if (zone && /san\s*blas/i.test(zone)) zone = 'Canillejas'
  const isAlquiler = /\balquiler\b/i.test(pageTitle)
  return { neighborhood: zone, city: zone, province, type: isAlquiler ? 'alquiler' : 'compra' }
}

function extractListingsFromHtml(html) {
  const listings = []
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : ''
  const defaults = extractFromTitle(pageTitle)

  const articleBlocks = html.split(/<article\s+[^>]*class="item\s/i)
  for (let i = 1; i < articleBlocks.length; i++) {
    const block = articleBlocks[i]
    const idMatch = block.match(/data-element-id="(\d+)"/)
    const adId = idMatch ? idMatch[1] : null
    const linkMatch = block.match(/href="(https:\/\/www\.idealista\.com\/inmueble\/\d+\/?)"/)
    const link = linkMatch ? linkMatch[1] : (adId ? `${BASE_URL}/inmueble/${adId}/` : null)
    if (!link) continue

    const titleAttr = block.match(/class="item-link[^"]*"[^>]*title="([^"]*)"/)
    const title = titleAttr ? titleAttr[1].trim() : null

    const priceMatch = block.match(/class="item-price[^>]*>\s*([\d.,]+)\s*</)
    const priceStr = priceMatch ? priceMatch[1] : null
    const price = parsePrice(priceStr)

    const roomsMatch = block.match(/class="item-detail">\s*(\d+)\s*hab\.?/i)
    const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null
    const m2Match = block.match(/class="item-detail">\s*(\d+)\s*m²/i)
    const surface = m2Match ? parseInt(m2Match[1], 10) : null

    const publishedAddress = title && title.includes(',') ? title.split(',').slice(0, -1).join(',').trim() : null

    listings.push({
      link,
      title: title || undefined,
      price: price || 0,
      surface: surface || undefined,
      rooms: rooms ?? undefined,
      neighborhood: defaults.neighborhood || undefined,
      city: defaults.city || undefined,
      province: defaults.province || 'Madrid',
      type: defaults.type || 'compra',
      publishedAddress: publishedAddress || undefined,
    })
  }
  return { listings, defaults }
}

async function importListing(data) {
  if (!data.link) return { skipped: true, reason: 'Sin link' }
  const existing = await prisma.listing.findFirst({ where: { link: data.link } })
  if (existing) return { skipped: true, link: data.link }

  const price = data.price || 0
  const type = (data.type === 'alquiler') ? 'alquiler' : 'compra'

  await prisma.listing.create({
    data: {
      link: data.link,
      title: data.title || null,
      price: Number(price),
      surface: data.surface != null ? Number(data.surface) : null,
      rooms: data.rooms != null ? parseInt(data.rooms, 10) : null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      province: data.province || 'Madrid',
      type,
      publishedAddress: data.publishedAddress || null,
      profitabilityRate: null,
    },
  })
  return { imported: true, link: data.link }
}

// Busca en Downloads: "Casas y pisos en Alcalá de Henares, Madrid — idealista.html"
function findAlcalaFile(downloadsDir) {
  try {
    const files = fs.readdirSync(downloadsDir)
    const lower = (s) => (s || '').toLowerCase()
    const sinAcentos = (s) => lower(s).normalize('NFD').replace(/\u0301/g, '')
    const match = files.find((f) => {
      if (!f.endsWith('.html') || f.includes('_files')) return false
      const n = sinAcentos(f)
      return n.includes('idealista') && n.includes('alcala') && n.includes('henares') && n.includes('madrid')
    })
    return match ? path.join(downloadsDir, match) : null
  } catch {
    return null
  }
}

async function main() {
  let filePath = process.argv[2]
  const downloadsDir = path.join(os.homedir(), 'Downloads')

  if (!filePath) {
    filePath = findAlcalaFile(downloadsDir)
    if (!filePath) {
      console.error('No se encontró en Downloads el archivo "Casas y pisos en Alcalá de Henares, Madrid — idealista.html".')
      console.error('Uso: node scripts/import-idealista-html.js "ruta/Casas y pisos en Alcalá de Henares, Madrid — idealista.html"')
      process.exit(1)
    }
    console.log('Usando archivo encontrado:', filePath)
  } else {
    filePath = path.resolve(filePath)
  }

  if (!fs.existsSync(filePath)) {
    console.error('No existe el archivo:', filePath)
    process.exit(1)
  }

  const html = fs.readFileSync(filePath, 'utf-8')
  const { listings, defaults } = extractListingsFromHtml(html)

  console.log('Zona detectada:', defaults.neighborhood || '(del título)', '| Provincia:', defaults.province, '| Tipo:', defaults.type)
  console.log('Anuncios encontrados:', listings.length)
  if (listings.length === 0) {
    console.log('No se encontraron anuncios en el HTML.')
    process.exit(0)
  }

  let imported = 0
  let skipped = 0
  for (const item of listings) {
    const result = await importListing(item)
    if (result.skipped) skipped++
    else imported++
    if (result.imported) console.log('  ✅', item.link)
  }

  console.log('')
  console.log('Resultado: importados', imported, '| omitidos (duplicados)', skipped, '| total', listings.length)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
