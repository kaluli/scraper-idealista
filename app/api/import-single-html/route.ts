import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractSingleListingFromDetailHtml } = require('../../../lib/parse-idealista-html')

const DB_ERROR_MESSAGE = 'No se pudo conectar a la base de datos. Verifica DATABASE_URL.'

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE },
      { status: 500 }
    )
  }

  let html = ''
  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Falta el archivo. Enviá un campo "file" con el HTML de la página de detalle.' },
          { status: 400 }
        )
      }
      html = await file.text()
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      html = typeof body.html === 'string' ? body.html : ''
    } else {
      return NextResponse.json(
        { success: false, error: 'Content-Type debe ser multipart/form-data (archivo) o application/json con { html: "..." }.' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al leer el cuerpo de la petición.' },
      { status: 400 }
    )
  }

  if (!html || html.trim().length < 500) {
    return NextResponse.json(
      { success: false, error: 'El HTML está vacío o no parece una página de detalle de Idealista. Guardá la página completa del anuncio.' },
      { status: 400 }
    )
  }

  // URL se obtiene del propio HTML (canonical, og:url o comentario "saved from url")
  const listing = extractSingleListingFromDetailHtml(html)
  if (!listing) {
    return NextResponse.json(
      { success: false, error: 'No se pudo extraer el anuncio. Asegurate de subir el HTML de una página de detalle de Idealista (un solo piso).' },
      { status: 400 }
    )
  }

  const link = String(listing.link).slice(0, 500)
  try {
    await prisma.$connect()
  } catch {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE },
      { status: 500 }
    )
  }

  const existing = await prisma.listing.findFirst({ where: { link } })
  if (existing) {
    return NextResponse.json(
      { success: true, message: 'Este anuncio ya está en la base de datos (omitido).', imported: 0, skipped: 1 },
      { status: 200 }
    )
  }

  const truncate = (s: unknown, max: number): string | null => {
    if (s == null || typeof s !== 'string') return null
    const t = String(s).trim()
    return t === '' ? null : t.slice(0, max)
  }
  const safeNum = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const safeInt = (v: unknown): number | null => {
    if (v == null) return null
    const n = parseInt(String(v), 10)
    return Number.isFinite(n) ? n : null
  }

  try {
    // Siempre Madrid para importación de un solo piso (evita Alcalá de Henares u otras ciudades como provincia)
    const province = 'Madrid'
    await prisma.listing.create({
      data: {
        link,
        title: truncate(listing.title, 255),
        price: safeNum(listing.price),
        surface: listing.surface != null ? safeNum(listing.surface) : null,
        rooms: safeInt(listing.rooms),
        neighborhood: truncate(listing.neighborhood, 100),
        city: truncate(listing.city, 100),
        province,
        type: listing.type === 'alquiler' ? 'alquiler' : 'compra',
        publishedAddress: truncate(listing.publishedAddress, 255),
        profitabilityRate: null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { success: false, error: `Error al guardar: ${msg}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Piso importado correctamente.',
    imported: 1,
    skipped: 0,
  })
}
