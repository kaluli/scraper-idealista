import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractListingsFromHtml } = require('../../../lib/parse-idealista-html')

const DB_ERROR_MESSAGE = 'No se pudo conectar a la base de datos. Verifica DATABASE_URL.'

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, imported: 0, skipped: 0, total: 0 },
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
          { success: false, error: 'Falta el archivo. Enviá un campo "file" con el HTML.' },
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
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Error al leer el cuerpo de la petición.' },
      { status: 400 }
    )
  }

  if (!html || html.trim().length < 100) {
    return NextResponse.json(
      { success: false, error: 'El HTML está vacío o es demasiado corto.' },
      { status: 400 }
    )
  }

  let listings: Array<Record<string, unknown>> = []
  let defaults: Record<string, string> = { neighborhood: '', city: '', province: 'Madrid', type: 'compra' }
  try {
    const parsed = extractListingsFromHtml(html)
    listings = parsed.listings || []
    defaults = parsed.defaults || defaults
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
    console.error('Parse HTML error:', parseErr)
    return NextResponse.json(
      { success: false, error: `Error al parsear el HTML: ${msg}`, imported: 0, skipped: 0, total: 0 },
      { status: 400 }
    )
  }

  if (listings.length === 0) {
    return NextResponse.json({
      success: true,
      imported: 0,
      skipped: 0,
      total: 0,
      message: 'No se encontraron anuncios en el HTML.',
      zone: defaults,
    })
  }

  try {
    await prisma.$connect()
  } catch (e) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, imported: 0, skipped: 0, total: listings.length },
      { status: 500 }
    )
  }

  const truncate = (s: unknown, max: number): string | null => {
    if (s == null || typeof s !== 'string') return null
    const t = String(s).trim()
    return t === '' ? null : t.slice(0, max)
  }
  const safeNum = (v: unknown): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const safeInt = (v: unknown): number | null => {
    if (v == null) return null
    const n = parseInt(String(v), 10)
    return Number.isFinite(n) ? n : null
  }

  let imported = 0
  let skipped = 0
  const errors: Array<{ link: string; error: string }> = []

  for (const data of listings) {
    const rawLink = data.link
    const link = typeof rawLink === 'string' ? rawLink.trim() : ''
    if (!link) {
      skipped++
      continue
    }
    if (link.length > 500) {
      errors.push({ link: link.slice(0, 50) + '…', error: 'Link demasiado largo' })
      continue
    }
    try {
      const existing = await prisma.listing.findFirst({ where: { link } })
      if (existing) {
        skipped++
        continue
      }
      const price = safeNum(data.price)
      const type = data.type === 'alquiler' ? 'alquiler' : 'compra'
      await prisma.listing.create({
        data: {
          link,
          title: truncate(data.title, 255),
          price,
          surface: data.surface != null ? safeNum(data.surface) : null,
          rooms: safeInt(data.rooms),
          neighborhood: truncate(data.neighborhood, 100),
          city: truncate(data.city, 100),
          province: truncate(data.province, 100) || 'Madrid',
          type,
          publishedAddress: truncate(data.publishedAddress, 255),
          profitabilityRate: null,
        },
      })
      imported++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ link: link.slice(0, 80), error: msg })
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: listings.length,
    zone: defaults,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    errorsCount: errors.length,
  })
}
