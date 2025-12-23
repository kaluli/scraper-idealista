import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Obtener lista de barrios únicos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // filtrar por tipo
    const all = searchParams.get('all') === 'true' // obtener todos los barrios disponibles
    const province = searchParams.get('province') // filtrar por provincia

    if (all) {
      // Obtener todos los barrios de la tabla Neighborhood
      const where: any = {}
      if (province) {
        where.province = province
      }
      
      const neighborhoods = await prisma.neighborhood.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      })
      return NextResponse.json({ 
        success: true, 
        data: neighborhoods.map(n => n.name) 
      })
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
      { success: false, error: 'Error al obtener los barrios' },
      { status: 500 }
    )
  }
}

