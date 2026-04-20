import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { listingNeighborhoodClause } from '@/lib/neighborhood-filter'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DB_ERROR_MESSAGE =
  'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → añadí DATABASE_URL (MySQL de producción).'

/**
 * Endpoint unificado: devuelve listings, stats, neighborhoods y provinces
 * en UNA sola conexión a la BD. Reduce de 4 conexiones a 1 por carga de página.
 */
export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: DB_ERROR_MESSAGE,
        data: {
          listings: [],
          stats: null,
          neighborhoods: [],
          provinces: [],
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const neighborhood = searchParams.get('neighborhood')
    const province = searchParams.get('province')
    const maxPrice = searchParams.get('maxPrice')

    const where: Prisma.ListingWhereInput = {}
    if (type && (type === 'alquiler' || type === 'compra')) {
      where.type = type
    }
    const nbClause = listingNeighborhoodClause(neighborhood)
    if (nbClause) Object.assign(where, nbClause)
    if (province && province !== 'all') {
      where.province =
        province === 'Madrid'
          ? { in: ['Madrid', 'Alcalá de Henares'] }
          : province
    }
    if (maxPrice) {
      where.price = { lte: parseFloat(maxPrice) }
    }

    // 1. Provincias (desde neighborhoods o listings)
    let provinces: string[] = []
    const neighborhoodsForProvinces = await prisma.neighborhood.findMany({
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    })
    provinces = neighborhoodsForProvinces
      .map((n) => n.province)
      .filter((p): p is string => p !== null && p !== '')
      .sort()

    if (provinces.length === 0) {
      const fromListings = await prisma.listing.findMany({
        where: { province: { not: null } },
        select: { province: true },
        distinct: ['province'],
      })
      provinces = fromListings
        .map((l) => l.province)
        .filter((p): p is string => p !== null && p !== '')
        .sort()
    }

    // 2. Listings con filtros (una sola query)
    const listings = await prisma.listing.findMany({
      where,
      orderBy: [
        { profitabilityRate: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // 3. Stats calculadas desde listings (en memoria)
    const stats = computeStats(listings, type ?? undefined)

    // 4. Barrios únicos desde listings filtrados
    const neighborhoods = Array.from(
      new Set(
        listings
          .map((l) => l.neighborhood)
          .filter((n): n is string => n !== null && n !== '')
      )
    ).sort()

    const res = NextResponse.json({
      success: true,
      data: {
        listings,
        stats,
        neighborhoods,
        provinces,
      },
    })
    res.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    )
    return res
  } catch (error) {
    console.error('Error fetching home-data:', error)
    return NextResponse.json(
      {
        success: false,
        error: DB_ERROR_MESSAGE,
        data: {
          listings: [],
          stats: null,
          neighborhoods: [],
          provinces: [],
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

function computeStats(
  listings: Array<{
    price: number
    surface: number | null
    rooms: number | null
    neighborhood: string | null
    type: string
  }>,
  typeFilter?: string
) {
  if (listings.length === 0) {
    return {
      total: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgSurface: 0,
      minSurface: 0,
      maxSurface: 0,
      avgRooms: 0,
      roomsDistribution: {} as Record<string, number>,
      byNeighborhood: {} as Record<string, unknown>,
    }
  }

  const prices = listings.map((l) => l.price).filter((p) => p > 0)
  const surfaces = listings
    .map((l) => l.surface)
    .filter((s): s is number => s !== null && s > 0)
  const rooms = listings
    .map((l) => l.rooms)
    .filter((r): r is number => r !== null && r >= 0)

  const avgPrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

  let avgPriceAlquiler: number | null = null
  let avgPriceCompra: number | null = null
  if (!typeFilter || typeFilter === 'all') {
    const alquilerPrices = listings
      .filter((l) => l.type === 'alquiler')
      .map((l) => l.price)
      .filter((p) => p > 0)
    const compraPrices = listings
      .filter((l) => l.type === 'compra')
      .map((l) => l.price)
      .filter((p) => p > 0)
    if (alquilerPrices.length > 0) {
      avgPriceAlquiler =
        alquilerPrices.reduce((a, b) => a + b, 0) / alquilerPrices.length
    }
    if (compraPrices.length > 0) {
      avgPriceCompra =
        compraPrices.reduce((a, b) => a + b, 0) / compraPrices.length
    }
  }

  const avgSurface =
    surfaces.length > 0
      ? surfaces.reduce((a, b) => a + b, 0) / surfaces.length
      : 0
  const minSurface = surfaces.length > 0 ? Math.min(...surfaces) : 0
  const maxSurface = surfaces.length > 0 ? Math.max(...surfaces) : 0
  const avgRooms =
    rooms.length > 0 ? rooms.reduce((a, b) => a + b, 0) / rooms.length : 0

  const roomsDistribution: Record<string, number> = {}
  listings.forEach((l) => {
    const key = l.rooms === null ? 'N/A' : l.rooms.toString()
    roomsDistribution[key] = (roomsDistribution[key] || 0) + 1
  })

  const byNeighborhood: Record<string, unknown> = {}
  const neighborhoodNames = Array.from(
    new Set(
      listings
        .map((l) => l.neighborhood)
        .filter((n): n is string => n !== null && n !== '')
    )
  )

  neighborhoodNames.forEach((neighborhood) => {
    const neighborhoodListings = listings.filter(
      (l) => l.neighborhood === neighborhood
    )
    const neighborhoodPrices = neighborhoodListings
      .map((l) => l.price)
      .filter((p) => p > 0)
    const neighborhoodSurfaces = neighborhoodListings
      .map((l) => l.surface)
      .filter((s): s is number => s !== null && s > 0)
    const neighborhoodRooms = neighborhoodListings
      .map((l) => l.rooms)
      .filter((r): r is number => r !== null && r >= 0)

    const alquilerListings = neighborhoodListings.filter(
      (l) => l.type === 'alquiler'
    )
    const compraListings = neighborhoodListings.filter(
      (l) => l.type === 'compra'
    )

    let avgProfitability: number | null = null
    let reliabilityPct: number | null = null

    if (alquilerListings.length > 0 && compraListings.length > 0) {
      const alquilerByRooms: Record<number, number[]> = {}
      const compraByRooms: Record<number, number[]> = {}

      alquilerListings.forEach((l) => {
        if (l.rooms !== null && l.price > 0) {
          if (!alquilerByRooms[l.rooms]) alquilerByRooms[l.rooms] = []
          alquilerByRooms[l.rooms].push(l.price)
        }
      })
      compraListings.forEach((l) => {
        if (l.rooms !== null && l.price > 0) {
          if (!compraByRooms[l.rooms]) compraByRooms[l.rooms] = []
          compraByRooms[l.rooms].push(l.price)
        }
      })

      const profitabilityRates: number[] = []
      Object.keys(alquilerByRooms).forEach((roomsStr) => {
        const rooms = parseInt(roomsStr)
        if (compraByRooms[rooms]) {
          const avgAlquiler =
            alquilerByRooms[rooms].reduce((a, b) => a + b, 0) /
            alquilerByRooms[rooms].length
          const avgCompra =
            compraByRooms[rooms].reduce((a, b) => a + b, 0) /
            compraByRooms[rooms].length
          if (avgCompra > 0) {
            profitabilityRates.push((avgAlquiler * 12 / avgCompra) * 100)
          }
        }
      })
      if (profitabilityRates.length > 0) {
        avgProfitability =
          profitabilityRates.reduce((a, b) => a + b, 0) /
          profitabilityRates.length
      }
      if (avgProfitability !== null) {
        reliabilityPct = Math.min(
          100,
          Math.round(
            25 +
              (alquilerListings.length + compraListings.length) * 1.2 +
              profitabilityRates.length * 12
          )
        )
      }
    }

    if (neighborhoodPrices.length > 0) {
      byNeighborhood[neighborhood] = {
        total: neighborhoodListings.length,
        avgPrice:
          neighborhoodPrices.reduce((a, b) => a + b, 0) /
          neighborhoodPrices.length,
        minPrice: Math.min(...neighborhoodPrices),
        maxPrice: Math.max(...neighborhoodPrices),
        avgSurface:
          neighborhoodSurfaces.length > 0
            ? neighborhoodSurfaces.reduce((a, b) => a + b, 0) /
              neighborhoodSurfaces.length
            : 0,
        avgRooms:
          neighborhoodRooms.length > 0
            ? neighborhoodRooms.reduce((a, b) => a + b, 0) /
              neighborhoodRooms.length
            : 0,
        avgProfitability,
        reliabilityPct,
      }
    }
  })

  return {
    total: listings.length,
    avgPrice: Math.round(avgPrice * 100) / 100,
    minPrice,
    maxPrice,
    avgPriceAlquiler:
      avgPriceAlquiler !== null ? Math.round(avgPriceAlquiler * 100) / 100 : null,
    avgPriceCompra:
      avgPriceCompra !== null ? Math.round(avgPriceCompra * 100) / 100 : null,
    avgSurface: Math.round(avgSurface * 100) / 100,
    minSurface,
    maxSurface,
    avgRooms: Math.round(avgRooms * 100) / 100,
    roomsDistribution,
    byNeighborhood,
  }
}
