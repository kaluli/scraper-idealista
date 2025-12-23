import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener lista de provincias únicas
export async function GET(request: NextRequest) {
  try {
    const neighborhoods = await prisma.neighborhood.findMany({
      select: {
        province: true,
      },
      distinct: ['province'],
      orderBy: {
        province: 'asc',
      },
    })

    const provinces = neighborhoods
      .map((n) => n.province)
      .filter((p): p is string => p !== null && p !== '')
      .sort()

    return NextResponse.json({ success: true, data: provinces })
  } catch (error) {
    console.error('Error fetching provinces:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener las provincias' },
      { status: 500 }
    )
  }
}

