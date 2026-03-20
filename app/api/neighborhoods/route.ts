import { NextRequest, NextResponse } from 'next/server'
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
    const all = searchParams.get('all') === 'true' // obtener todos los barrios disponibles
    const province = searchParams.get('province') // filtrar por provincia

    if (all) {
      const where: any = {}
      if (province && province !== 'all') {
        where.province = province === 'Madrid' ? { in: ['Madrid', 'Alcalá de Henares'] } : province
      }
      const neighborhoods = await prisma.neighborhood.findMany({
        where,
        orderBy: { name: 'asc' },
      })
      let names = neighborhoods.map((n) => n.name)
      if (names.length === 0) {
        const listingWhere: any = { neighborhood: { not: null } }
        if (province && province !== 'all') {
          listingWhere.province = province === 'Madrid' ? { in: ['Madrid', 'Alcalá de Henares'] } : province
        }
        const fromListings = await prisma.listing.findMany({
          where: listingWhere,
          select: { neighborhood: true },
          distinct: ['neighborhood'],
        })
        names = fromListings
          .map((l) => l.neighborhood)
          .filter((n): n is string => n !== null && n !== '')
          .sort()
      }
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

