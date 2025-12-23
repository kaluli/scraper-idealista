import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Verificar estado de la conexión a la base de datos
export async function GET(request: NextRequest) {
  try {
    // Intentar conectar a la base de datos
    await prisma.$connect()
    
    // Verificar que las tablas existan
    const listingsCount = await prisma.listing.count()
    const neighborhoodsCount = await prisma.neighborhood.count()
    
    // Obtener DATABASE_URL (sin mostrar la contraseña completa)
    const dbUrl = process.env.DATABASE_URL || 'NOT SET'
    const maskedUrl = dbUrl.includes('@') 
      ? dbUrl.split('@')[0] + '@***' 
      : dbUrl
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        url: maskedUrl,
        tables: {
          listings: listingsCount,
          neighborhoods: neighborhoodsCount
        }
      }
    })
  } catch (error: any) {
    const dbUrl = process.env.DATABASE_URL || 'NOT SET'
    const maskedUrl = dbUrl.includes('@') 
      ? dbUrl.split('@')[0] + '@***' 
      : dbUrl
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error de conexión',
      database: {
        connected: false,
        url: maskedUrl,
        message: 'No se puede conectar a la base de datos. Verifica DATABASE_URL en Railway.'
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

