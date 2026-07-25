import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildListingWhereFromSearchParams } from '@/lib/build-listing-where'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

const DB_ERROR_MESSAGE =
  'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → DATABASE_URL (PostgreSQL / Neon).'

function mergeRow(
  listing: Record<string, unknown>,
  state:
    | {
        citaAt: Date | null
        contacto: string | null
        phone: string | null
        notas: string | null
        llamado: boolean
        visitado: boolean
      }
    | undefined
) {
  return {
    ...listing,
    citaAt: state?.citaAt ? state.citaAt.toISOString() : null,
    contacto: state?.contacto ?? null,
    phone: state?.phone ?? null,
    notas: state?.notas ?? null,
    llamado: state?.llamado ?? false,
    visitado: state?.visitado ?? false,
  }
}

/** Listados de compra para Contactos: catálogo global + estado por usuario (excluye ocultos). */
export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, data: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autorizado', data: [] }, { status: 401 })
  }

  const userId = parseInt(session.user.id, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Sesión inválida', data: [] }, { status: 401 })
  }

  try {
    await prisma.$connect()
    const searchParams = request.nextUrl.searchParams
    const where = buildListingWhereFromSearchParams(searchParams)

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))

    const allListings = await prisma.listing.findMany({
      where,
      orderBy: [{ profitabilityRate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, neighborhood: true, province: true },
    })

    if (allListings.length === 0) {
      const res = NextResponse.json({ success: true, data: [], filteredCount: 0, barrios: [], page, limit })
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    const ids = allListings.map((l) => l.id)
    const states = await prisma.userListingState.findMany({
      where: { userId, listingId: { in: ids } },
    })
    const stateByListing = new Map(states.map((s) => [s.listingId, s]))

    const visibleItems = allListings.filter((l) => !stateByListing.get(l.id)?.hiddenAt)

    const barriosMap = new Map<string, number>()
    for (const l of visibleItems) {
      const b = l.neighborhood?.trim()
      if (b) barriosMap.set(b, (barriosMap.get(b) || 0) + 1)
    }
    const barrios = Array.from(barriosMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([name, count]) => ({ name, count }))

    const provincesSet = new Set<string>()
    for (const l of visibleItems) {
      const pr = l.province?.trim()
      if (pr) provincesSet.add(pr)
    }
    const provinces = Array.from(provincesSet).sort((a, b) => a.localeCompare(b, 'es'))

    const filteredCount = visibleItems.length
    const offset = (page - 1) * limit
    const pageIds = visibleItems.slice(offset, offset + limit).map((l) => l.id)

    if (pageIds.length === 0) {
      const res = NextResponse.json({ success: true, data: [], filteredCount, barrios, provinces, page, limit })
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    const listings = await prisma.listing.findMany({
      where: { id: { in: pageIds } },
    })
    const listingsById = new Map(listings.map((l) => [l.id, l]))

    const merged = pageIds.map((id) => {
      const l = listingsById.get(id)
      if (!l) return null
      const plain = JSON.parse(JSON.stringify(l)) as Record<string, unknown>
      return mergeRow(plain, stateByListing.get(id))
    }).filter(Boolean)

    const res = NextResponse.json({ success: true, data: merged, filteredCount, barrios, provinces, page, limit })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error) {
    console.error('[GET /api/contactos/listings]', error)
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, data: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

/** Crear piso en catálogo + estado inicial del usuario actual (solo administradores). */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  const userId = parseInt(auth.session.user.id!, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  try {
    await prisma.$connect()
    const body = await request.json()

    const {
      title,
      price,
      precio_eur_mes,
      surface,
      metros_cuadrados,
      link,
      profitabilityRate,
      tasa_rentabilidad,
      type,
      neighborhood,
      barrio,
      city,
      publishedAddress,
      direccion_publicada,
      rooms,
      habitaciones,
      province,
      contacto: rawContacto,
      phone: rawPhone,
      notas: rawNotas,
      citaAt: rawCita,
      llamado: rawLlamado,
      visitado: rawVisitado,
    } = body

    const finalPrice = precio_eur_mes || price
    const finalSurface = metros_cuadrados || surface
    const finalNeighborhood = barrio || neighborhood
    const finalPublishedAddress = direccion_publicada || publishedAddress
    const finalRooms = habitaciones || rooms
    const finalProfitabilityRate = tasa_rentabilidad || profitabilityRate

    const linkRaw = typeof link === 'string' ? link.trim() : ''
    const finalLink = linkRaw || 'https://www.idealista.com/'

    if (!finalPrice) {
      return NextResponse.json({ success: false, error: 'Falta el precio' }, { status: 400 })
    }

    let finalType = type
    if (!finalType) {
      finalType = precio_eur_mes ? 'alquiler' : 'compra'
    }

    if (finalType !== 'alquiler' && finalType !== 'compra') {
      return NextResponse.json(
        { success: false, error: 'El tipo debe ser "alquiler" o "compra"' },
        { status: 400 }
      )
    }

    const provinceVal =
      typeof province === 'string' && province.trim() !== '' ? province.trim() : 'Madrid'

    const contactoVal =
      rawContacto === 'Juli' || rawContacto === 'Kalu' ? (rawContacto as string) : null
    const phoneVal =
      rawPhone != null && String(rawPhone).trim() !== '' ? String(rawPhone).trim() : null
    const notasVal =
      rawNotas != null && String(rawNotas).trim() !== '' ? String(rawNotas).trim() : null
    let citaAtVal: Date | null = null
    if (rawCita) {
      const citaDate = new Date(String(rawCita))
      citaAtVal = Number.isNaN(citaDate.getTime()) ? null : citaDate
    }
    const llamadoVal = Boolean(rawLlamado)
    const visitadoVal = Boolean(rawVisitado)

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          title: title || null,
          price: parseFloat(String(finalPrice)),
          surface: finalSurface ? parseFloat(String(finalSurface)) : null,
          link: finalLink,
          profitabilityRate: finalProfitabilityRate ? parseFloat(String(finalProfitabilityRate)) : null,
          type: finalType,
          neighborhood: finalNeighborhood || null,
          city: city != null && String(city).trim() !== '' ? String(city).trim() : null,
          province: provinceVal,
          publishedAddress: finalPublishedAddress || null,
          rooms: finalRooms != null && finalRooms !== '' ? parseInt(String(finalRooms), 10) : null,
        },
      })

      await tx.userListingState.create({
        data: {
          userId,
          listingId: listing.id,
          contacto: contactoVal,
          phone: phoneVal,
          notas: notasVal,
          citaAt: citaAtVal,
          llamado: llamadoVal,
          visitado: visitadoVal,
        },
      })

      const plain = JSON.parse(JSON.stringify(listing)) as Record<string, unknown>
      return mergeRow(plain, {
        citaAt: citaAtVal,
        contacto: contactoVal,
        phone: phoneVal,
        notas: notasVal,
        llamado: llamadoVal,
        visitado: visitadoVal,
      })
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/contactos/listings]', error)
    return NextResponse.json({ success: false, error: 'Error al crear el piso' }, { status: 500 })
  }
}
