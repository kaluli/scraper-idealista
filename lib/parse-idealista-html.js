/**
 * Parser para extraer listados de una página HTML guardada de Idealista.
 * Usado por la API /api/import-html y por scripts/import-idealista-html.js
 */

const BASE_URL = 'https://www.idealista.com'

function parsePrice(str) {
  if (!str) return null
  const cleaned = String(str).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function extractFromTitle(pageTitle) {
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
  if (zone && /san\s*blas/i.test(zone)) zone = 'Canillejas'
  const isAlquiler = /\balquiler\b/i.test(pageTitle)
  return { neighborhood: zone, city: zone, province, type: isAlquiler ? 'alquiler' : 'compra' }
}

/**
 * Extrae los listados del HTML de una búsqueda de Idealista.
 * @param {string} html - Contenido HTML de la página
 * @returns {{ listings: Array<object>, defaults: object }}
 */
function extractListingsFromHtml(html) {
  const listings = []
  if (typeof html !== 'string') return { listings, defaults: { neighborhood: null, city: null, province: 'Madrid', type: 'compra' } }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : ''
  const defaults = extractFromTitle(pageTitle)

  // Formato Idealista: <article ... class="item " o class="item item-multimedia"
  const articleBlocks = html.split(/<article\s+[^>]*class="item\s/i)
  for (let i = 1; i < articleBlocks.length; i++) {
    const block = articleBlocks[i]
    if (!block || block.length < 50) continue
    const idMatch = block.match(/data-element-id="(\d+)"/)
    const adId = idMatch ? idMatch[1] : null
    const linkMatch = block.match(/href="(https:\/\/www\.idealista\.com\/inmueble\/\d+\/?)"/)
    let link = linkMatch ? linkMatch[1] : (adId ? `${BASE_URL}/inmueble/${adId}/` : null)
    if (!link) continue
    link = link.trim()
    if (link.length > 500) continue

    const titleAttr = block.match(/class="item-link[^"]*"[^>]*title="([^"]*)"/) ||
      block.match(/title="([^"]*)"[^>]*class="[^"]*item-link/i)
    const title = titleAttr ? titleAttr[1].trim().slice(0, 255) : null

    const priceMatch = block.match(/class="item-price[^"]*"[^>]*>\s*([\d.,\s]+)\s*</) ||
      block.match(/item-price[^>]*>\s*([\d.,\s]+)\s*</)
    const priceStr = priceMatch ? priceMatch[1] : null
    const price = parsePrice(priceStr)

    const roomsMatch = block.match(/item-detail[^>]*>\s*(\d+)\s*hab\.?/i) || block.match(/>\s*(\d+)\s*hab\.?/i)
    const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null
    const m2Match = block.match(/item-detail[^>]*>\s*(\d+)\s*m²/i) || block.match(/>\s*(\d+)\s*m²/i)
    const surface = m2Match ? parseInt(m2Match[1], 10) : null

    const publishedAddress = title && title.includes(',') ? title.split(',').slice(0, -1).join(',').trim().slice(0, 255) : null

    listings.push({
      link,
      title: title || undefined,
      price: Number.isFinite(price) ? price : 0,
      surface: surface != null && Number.isFinite(surface) ? surface : undefined,
      rooms: rooms != null && Number.isFinite(rooms) ? rooms : undefined,
      neighborhood: defaults.neighborhood || undefined,
      city: defaults.city || undefined,
      province: defaults.province || 'Madrid',
      type: defaults.type || 'compra',
      publishedAddress: publishedAddress || undefined,
    })
  }
  return { listings, defaults }
}

/**
 * Extrae la URL del anuncio de un HTML guardado (página de detalle).
 * Busca en: canonical, og:url, o el comentario "saved from url=..."
 * @param {string} html - Contenido HTML
 * @returns {string|null} - URL del inmueble o null
 */
function getDetailPageUrlFromHtml(html) {
  if (typeof html !== 'string' || html.length < 50) return null
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="(https:\/\/www\.idealista\.com\/inmueble\/\d+\/?)"/i)
  if (canonicalMatch) return canonicalMatch[1].trim()
  const ogMatch = html.match(/<meta\s+property="og:url"\s+content="(https:\/\/www\.idealista\.com\/inmueble\/\d+\/?)"/i)
  if (ogMatch) return ogMatch[1].trim()
  const savedMatch = html.match(/saved from url=\(\d+\)(https:\/\/www\.idealista\.com\/inmueble\/\d+\/?)/i)
  if (savedMatch) return savedMatch[1].trim()
  return null
}

/**
 * Extrae un solo anuncio del HTML de una página de detalle de Idealista.
 * @param {string} html - Contenido HTML de la página de detalle
 * @param {string} url - URL del anuncio (se normaliza). Si no se pasa, se intenta extraer del HTML.
 * @returns {object|null} - Un listing o null si no se pudo extraer
 */
function extractSingleListingFromDetailHtml(html, url) {
  if (typeof html !== 'string' || html.length < 100) return null
  let link = typeof url === 'string' ? url.trim() : ''
  if (!link) link = getDetailPageUrlFromHtml(html) || ''
  link = link.replace(/#.*$/, '').replace(/\?.*$/, '')
  if (!link || !link.includes('idealista.com/inmueble/')) return null

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : ''
  const defaults = extractFromTitle(pageTitle)

  const title = pageTitle.replace(/\s*—\s*idealista\s*$/i, '').trim().slice(0, 255) || null
  const publishedAddress = title && title.includes(',') ? title.split(',').slice(0, -1).join(',').trim().slice(0, 255) : title

  let price = null
  // Prefer main listing price in detail page: <strong class="price">184.000 €</strong> (avoids matching CSS)
  const detailPriceMatch = html.match(/<[^>]+class="price"[^>]*>\s*([\d.,\s]+)\s*€/i)
  if (detailPriceMatch) {
    price = parsePrice(detailPriceMatch[1])
  }
  if (price == null) {
    const jsonLdMatch = html.match(/"price"\s*:\s*(\d+)/)
    if (jsonLdMatch) price = parseInt(jsonLdMatch[1], 10)
  }
  if (price == null) {
    const priceMatch = html.match(/(?:item-price|price)[^>]*>\s*([\d.,\s]+)\s*€?/i) || html.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*€/)
    if (priceMatch) price = parsePrice(priceMatch[1])
  }
  if (price == null || !Number.isFinite(price)) price = 0

  const roomsMatch = html.match(/(\d+)\s*hab\.?/i)
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null
  const m2Match = html.match(/(\d+)\s*m²/i)
  const surface = m2Match ? parseInt(m2Match[1], 10) : null

  return {
    link: link.length > 500 ? link.slice(0, 500) : link,
    title: title || undefined,
    price,
    surface: surface != null && Number.isFinite(surface) ? surface : undefined,
    rooms: rooms != null && Number.isFinite(rooms) ? rooms : undefined,
    neighborhood: defaults.neighborhood || undefined,
    city: defaults.city || undefined,
    province: defaults.province || 'Madrid',
    type: defaults.type || 'compra',
    publishedAddress: publishedAddress || undefined,
  }
}

module.exports = { parsePrice, extractFromTitle, extractListingsFromHtml, extractSingleListingFromDetailHtml, getDetailPageUrlFromHtml }
