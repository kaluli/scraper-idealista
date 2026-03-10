import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener lista de provincias únicas (neighborhoods → listings → SQL directo como respaldo)
export async function GET(request: NextRequest) {
  try {
    await prisma.$connect()
    let provinces: string[] = []

    const neighborhoods = await prisma.neighborhood.findMany({
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    })
    provinces = neighborhoods
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

    if (provinces.length === 0) {
      try {
        const raw = await prisma.$queryRaw<Array<{ province?: string; Province?: string }>>`
          SELECT DISTINCT province FROM listings WHERE province IS NOT NULL AND province != '' ORDER BY province
        `
        provinces = raw
          .map((r) => (r.province ?? r.Province ?? '') as string)
          .filter(Boolean)
      } catch {
        // En algunos entornos (p. ej. MySQL remoto) la query raw puede fallar; mantener []
      }
    }

    const debug = request.nextUrl.searchParams.get('debug') === '1'
    const payload: { success: true; data: string[]; debug?: { listingsCount: number; neighborhoodsCount: number } } = { success: true, data: provinces }
    if (debug && provinces.length === 0) {
      const [listingsCount, neighborhoodsCount] = await Promise.all([
        prisma.listing.count(),
        prisma.neighborhood.count(),
      ])
      payload.debug = { listingsCount, neighborhoodsCount }
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching provinces:', error)
    // Devolver 200 con data vacía para no romper la UI (local o prod con DB temporalmente mal)
    const res = NextResponse.json({ success: true, data: [] })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  }
}


