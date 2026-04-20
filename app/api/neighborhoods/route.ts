import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DB_ERROR_MESSAGE = 'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → añadí DATABASE_URL (MySQL de producción).'

// GET - Obtener lista de barrios únicos
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
    const type = searchParams.get('type') // filtrar por tipo
    const all = searchParams.get('all') === 'true' // barrios derivados de pisos (no tabla seed)
    const province = searchParams.get('province') // filtrar por provincia
    const maxPrice = searchParams.get('maxPrice')

    /** Solo barrios donde hay ≥1 listing que cumpla provincia / tipo / precio (como la home). */
    if (all) {
      const listingWhere: Prisma.ListingWhereInput = {
        neighborhood: { not: null },
      }
      if (province && province !== 'all') {
        listingWhere.province =
          province === 'Madrid'
            ? { in: ['Madrid', 'Alcalá de Henares'] }
            : province
      }
      if (type && (type === 'alquiler' || type === 'compra')) {
        listingWhere.type = type
      }
      if (maxPrice && maxPrice !== 'all') {
        const n = parseFloat(maxPrice)
        if (!Number.isNaN(n)) {
          listingWhere.price = { lte: n }
        }
      }
      const fromListings = await prisma.listing.findMany({
        where: listingWhere,
        select: { neighborhood: true },
        distinct: ['neighborhood'],
      })
      const names = fromListings
        .map((l) => l.neighborhood)
        .filter((n): n is string => n !== null && String(n).trim() !== '')
        .sort((a, b) => a.localeCompare(b, 'es'))
      return NextResponse.json({ success: true, data: names })
    }

    // Obtener barrios únicos de los pisos (comportamiento original)
    const where: any = {
      neighborhood: {
        not: null,
      },
    }

    if (type && (type === 'alquiler' || type === 'compra')) {
      where.type = type
    }

    const listings = await prisma.listing.findMany({
      where,
      select: {
        neighborhood: true,
      },
      distinct: ['neighborhood'],
    })

    const neighborhoods = listings
      .map((l) => l.neighborhood)
      .filter((n): n is string => n !== null)
      .sort()

    return NextResponse.json({ success: true, data: neighborhoods })
  } catch (error) {
    console.error('Error fetching neighborhoods:', error)
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE, data: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

