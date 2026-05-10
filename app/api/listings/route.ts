import { NextRequest, NextResponse } from 'next/server'
import { buildListingWhereFromSearchParams } from '@/lib/build-listing-where'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

const DB_ERROR_MESSAGE =
  'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → DATABASE_URL (PostgreSQL / Neon).'

// GET - Obtener todos los pisos con filtros
export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, data: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  try {
    await prisma.$connect()
    const searchParams = request.nextUrl.searchParams
    const where = buildListingWhereFromSearchParams(searchParams)

    const listings = await prisma.listing.findMany({
      where,
      orderBy: [
        {
          profitabilityRate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    })

    const res = NextResponse.json({ success: true, data: listings })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, data: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

// POST - Crear un nuevo piso (solo administradores)
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    await prisma.$connect()
    const body = await request.json()
    
    // Aceptar formato JSON del scraper o formato del formulario
    const {
      title,
      price,
      precio_eur_mes, // formato del scraper
      surface,
      metros_cuadrados, // formato del scraper
      link,
      profitabilityRate,
      tasa_rentabilidad, // formato del scraer
      type,
      neighborhood,
      barrio, // formato del scraper
      city,
      publishedAddress,
      direccion_publicada, // formato del scraper
      rooms,
      habitaciones, // formato del scraper
    } = body

    // Normalizar campos del scraper al formato de la BD
    const finalPrice = precio_eur_mes || price
    const finalSurface = metros_cuadrados || surface
    const finalNeighborhood = barrio || neighborhood
    const finalPublishedAddress = direccion_publicada || publishedAddress
    const finalRooms = habitaciones || rooms
    const finalProfitabilityRate = tasa_rentabilidad || profitabilityRate

    const linkRaw = typeof link === 'string' ? link.trim() : ''
    const finalLink = linkRaw || 'https://www.idealista.com/'

    if (!finalPrice) {
      return NextResponse.json(
        { success: false, error: 'Falta el precio' },
        { status: 400 }
      )
    }

    // Si no viene type, intentar inferirlo del precio_eur_mes (alquiler) o precio (compra)
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

    const { province } = body

    const provinceVal =
      typeof province === 'string' && province.trim() !== '' ? province.trim() : 'Madrid'

    const listing = await prisma.listing.create({
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

    return NextResponse.json({ success: true, data: listing }, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear el piso' },
      { status: 500 }
    )
  }
}

