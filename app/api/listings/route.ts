import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los pisos con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'alquiler' o 'compra'
    const neighborhood = searchParams.get('neighborhood') // barrio específico
    const province = searchParams.get('province') // provincia específica
    const maxPrice = searchParams.get('maxPrice') // precio máximo

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

    if (maxPrice) {
      where.price = {
        lte: parseFloat(maxPrice),
      }
    }

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

    return NextResponse.json({ success: true, data: listings })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener los pisos' },
      { status: 500 }
    )
  }
}

// POST - Crear un nuevo piso
export async function POST(request: NextRequest) {
  try {
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

    // Validaciones
    if (!finalPrice || !link) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: precio y link' },
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

    const listing = await prisma.listing.create({
      data: {
        title: title || null,
        price: parseFloat(finalPrice),
        surface: finalSurface ? parseFloat(finalSurface) : null,
        link,
        profitabilityRate: finalProfitabilityRate ? parseFloat(finalProfitabilityRate) : null,
        type: finalType,
        neighborhood: finalNeighborhood || null,
        city: city || null,
        province: body.province || null,
        publishedAddress: finalPublishedAddress || null,
        rooms: finalRooms ? parseInt(finalRooms) : null,
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

