import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener estadísticas de los pisos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'alquiler' o 'compra'
    const neighborhood = searchParams.get('neighborhood') // barrio específico
    const province = searchParams.get('province') // provincia específica
    const maxPriceParam = searchParams.get('maxPrice') // precio máximo del filtro

    const where: any = {}
    
    if (type && (type === 'alquiler' || type === 'compra')) {
      where.type = type
    }
    
    if (neighborhood) {
      where.neighborhood = neighborhood
    }
    
    if (province) {
      where.province = province
    }

    if (maxPriceParam) {
      where.price = {
        lte: parseFloat(maxPriceParam),
      }
    }

    // Obtener todos los pisos con los filtros aplicados
    const listings = await prisma.listing.findMany({
      where,
      select: {
        price: true,
        surface: true,
        rooms: true,
        neighborhood: true,
        type: true,
      },
    })

    if (listings.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          avgSurface: 0,
          minSurface: 0,
          maxSurface: 0,
          avgRooms: 0,
          roomsDistribution: {},
          byNeighborhood: {},
        },
      })
    }

    // Estadísticas generales
    const prices = listings.map((l) => l.price).filter((p) => p > 0)
    const surfaces = listings.map((l) => l.surface).filter((s): s is number => s !== null && s > 0)
    const rooms = listings.map((l) => l.rooms).filter((r): r is number => r !== null && r >= 0)

    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    // Calcular precios promedio separados por tipo (solo si no hay filtro de tipo)
    let avgPriceAlquiler: number | null = null
    let avgPriceCompra: number | null = null
    
    if (!type || type === 'all') {
      const alquilerPrices = listings.filter((l) => l.type === 'alquiler').map((l) => l.price).filter((p) => p > 0)
      const compraPrices = listings.filter((l) => l.type === 'compra').map((l) => l.price).filter((p) => p > 0)
      
      if (alquilerPrices.length > 0) {
        avgPriceAlquiler = alquilerPrices.reduce((a, b) => a + b, 0) / alquilerPrices.length
      }
      
      if (compraPrices.length > 0) {
        avgPriceCompra = compraPrices.reduce((a, b) => a + b, 0) / compraPrices.length
      }
    }

    const avgSurface = surfaces.length > 0 ? surfaces.reduce((a, b) => a + b, 0) / surfaces.length : 0
    const minSurface = surfaces.length > 0 ? Math.min(...surfaces) : 0
    const maxSurface = surfaces.length > 0 ? Math.max(...surfaces) : 0

    const avgRooms = rooms.length > 0 ? rooms.reduce((a, b) => a + b, 0) / rooms.length : 0

    // Distribución de habitaciones (incluyendo 0 y null)
    const roomsDistribution: Record<string, number> = {}
    listings.forEach((l) => {
      let key: string
      if (l.rooms === null) {
        key = 'N/A'
      } else {
        key = l.rooms.toString()
      }
      roomsDistribution[key] = (roomsDistribution[key] || 0) + 1
    })

    // Estadísticas por barrio
    const byNeighborhood: Record<string, any> = {}
    const neighborhoods = Array.from(new Set(listings.map((l) => l.neighborhood).filter((n): n is string => n !== null)))

    neighborhoods.forEach((neighborhood) => {
      const neighborhoodListings = listings.filter((l) => l.neighborhood === neighborhood)
      const neighborhoodPrices = neighborhoodListings.map((l) => l.price).filter((p) => p > 0)
      const neighborhoodSurfaces = neighborhoodListings.map((l) => l.surface).filter((s): s is number => s !== null && s > 0)
      const neighborhoodRooms = neighborhoodListings.map((l) => l.rooms).filter((r): r is number => r !== null && r >= 0)

      // Separar alquiler y compra
      const alquilerListings = neighborhoodListings.filter((l) => l.type === 'alquiler')
      const compraListings = neighborhoodListings.filter((l) => l.type === 'compra')

      // Calcular rentabilidad comparando alquiler vs compra por habitaciones
      let avgProfitability: number | null = null
      
      if (alquilerListings.length > 0 && compraListings.length > 0) {
        // Agrupar por número de habitaciones
        const alquilerByRooms: Record<number, number[]> = {}
        const compraByRooms: Record<number, number[]> = {}

        alquilerListings.forEach((l) => {
          if (l.rooms !== null && l.price > 0) {
            if (!alquilerByRooms[l.rooms]) {
              alquilerByRooms[l.rooms] = []
            }
            alquilerByRooms[l.rooms].push(l.price)
          }
        })

        compraListings.forEach((l) => {
          if (l.rooms !== null && l.price > 0) {
            if (!compraByRooms[l.rooms]) {
              compraByRooms[l.rooms] = []
            }
            compraByRooms[l.rooms].push(l.price)
          }
        })

        // Calcular rentabilidad para cada número de habitaciones que tenga ambos tipos
        const profitabilityRates: number[] = []
        
        Object.keys(alquilerByRooms).forEach((roomsStr) => {
          const rooms = parseInt(roomsStr)
          if (compraByRooms[rooms]) {
            // Promedio de alquiler mensual para esta cantidad de habitaciones
            const avgAlquiler = alquilerByRooms[rooms].reduce((a, b) => a + b, 0) / alquilerByRooms[rooms].length
            // Promedio de precio de compra para esta cantidad de habitaciones
            const avgCompra = compraByRooms[rooms].reduce((a, b) => a + b, 0) / compraByRooms[rooms].length
            
            // Rentabilidad = (alquiler anual / precio compra) * 100
            // Alquiler anual = alquiler mensual * 12
            if (avgCompra > 0) {
              const rentabilidad = (avgAlquiler * 12 / avgCompra) * 100
              profitabilityRates.push(rentabilidad)
            }
          }
        })

        // Promedio de rentabilidades calculadas
        if (profitabilityRates.length > 0) {
          avgProfitability = profitabilityRates.reduce((a, b) => a + b, 0) / profitabilityRates.length
        }
      }

      if (neighborhoodPrices.length > 0) {
        byNeighborhood[neighborhood] = {
          total: neighborhoodListings.length,
          avgPrice: neighborhoodPrices.reduce((a, b) => a + b, 0) / neighborhoodPrices.length,
          minPrice: Math.min(...neighborhoodPrices),
          maxPrice: Math.max(...neighborhoodPrices),
          avgSurface: neighborhoodSurfaces.length > 0 ? neighborhoodSurfaces.reduce((a, b) => a + b, 0) / neighborhoodSurfaces.length : 0,
          avgRooms: neighborhoodRooms.length > 0 ? neighborhoodRooms.reduce((a, b) => a + b, 0) / neighborhoodRooms.length : 0,
          avgProfitability: avgProfitability,
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        total: listings.length,
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice,
        maxPrice,
        avgPriceAlquiler: avgPriceAlquiler !== null ? Math.round(avgPriceAlquiler * 100) / 100 : null,
        avgPriceCompra: avgPriceCompra !== null ? Math.round(avgPriceCompra * 100) / 100 : null,
        avgSurface: Math.round(avgSurface * 100) / 100,
        minSurface,
        maxSurface,
        avgRooms: Math.round(avgRooms * 100) / 100,
        roomsDistribution,
        byNeighborhood,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener las estadísticas' },
      { status: 500 }
    )
  }
}

