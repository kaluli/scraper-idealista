import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Endpoint para importación masiva de pisos desde JSON
 * POST /api/import
 * Body: { listings: [...] } o directamente [...]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Aceptar tanto { listings: [...] } como directamente [...]
    const listings = Array.isArray(body) ? body : (body.listings || [])
    
    if (!Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se espera un array de pisos' },
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0
    const errors: any[] = []

    for (const data of listings) {
      try {
        // Verificar si el piso ya existe por su link
        const existing = await prisma.listing.findFirst({
          where: { link: data.link },
        })

        if (existing) {
          skipped++
          continue
        }

        // Normalizar campos de precio (múltiples formatos)
        const price = data.precio_mensual_eur || data.precio_eur_mes || data.precio_venta_eur || data.precio || 0
        
        // Normalizar superficie (múltiples formatos)
        const surface = data.m2 || data.metros_cuadrados || data.surface || null
        
        // Normalizar barrio y extraer ciudad si viene en el nombre
        let neighborhood = data.barrio || data.neighborhood || null
        let city = data.ciudad || data.city || null
        
        // Si el barrio incluye la ciudad (ej: "Zona Juan Carlos I - Avenida de Europa, Murcia")
        if (neighborhood && neighborhood.includes(',')) {
          const parts = neighborhood.split(',').map(p => p.trim())
          if (parts.length > 1) {
            neighborhood = parts[0].trim()
            city = parts[parts.length - 1].trim()
          }
        }
        
        // Normalizar nombre del barrio conocido
        if (neighborhood) {
          if (neighborhood.includes('Juan Carlos I') || neighborhood.includes('Juan de Borbón') || neighborhood.includes('Avenida de Europa')) {
            neighborhood = 'Juan Carlos I (Juan de Borbón)'
          } else if (neighborhood.includes('Santa Eulalia') || neighborhood.includes('Centro – Santa Eulalia')) {
            neighborhood = 'Centro – Santa Eulalia'
          } else if (neighborhood.includes('Espinardo')) {
            neighborhood = 'Espinardo'
          } else if (neighborhood.includes('San Lorenzo')) {
            neighborhood = 'San Lorenzo'
          } else if (neighborhood.includes('Vistalegre')) {
            neighborhood = 'Vistalegre'
          } else if (neighborhood.includes('El Carmen')) {
            neighborhood = 'El Carmen'
          }
        }

        // Validar campos requeridos
        if (!data.link || !price) {
          errors.push({ link: data.link || 'sin link', error: 'Faltan campos requeridos' })
          continue
        }

        // Crear el piso
        await prisma.listing.create({
          data: {
            link: data.link,
            neighborhood: neighborhood,
            publishedAddress: data.direccion_publicada || data.publishedAddress || null,
            price: parseFloat(price.toString()),
            surface: surface ? parseFloat(surface.toString()) : null,
            rooms: data.habitaciones !== undefined ? (data.habitaciones === null ? null : parseInt(data.habitaciones.toString())) : null,
            type: (data.precio_mensual_eur || data.precio_eur_mes) ? 'alquiler' : (data.precio_venta_eur ? 'compra' : 'compra'),
            title: data.titulo || data.title || null,
            city: city,
            province: data.province || 'Murcia',
            profitabilityRate: data.tasa_rentabilidad || data.profitabilityRate || null,
          },
        })
        
        imported++
      } catch (error: any) {
        errors.push({ link: data.link || 'sin link', error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: listings.length
    })
  } catch (error: any) {
    console.error('Error importing listings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al importar los pisos' },
      { status: 500 }
    )
  }
}

