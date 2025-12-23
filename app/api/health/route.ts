import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Verificar estado de la conexión a la base de datos
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Verificar variables de entorno básicas
  const hasDatabaseUrl = !!process.env.DATABASE_URL
  const nodeEnv = process.env.NODE_ENV || 'development'
  const port = process.env.PORT || '3000'
  
  // Si no hay DATABASE_URL, retornar error inmediatamente
  if (!hasDatabaseUrl) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Environment variable not found: DATABASE_URL',
      errorType: 'MissingEnvironmentVariable',
      message: 'La variable DATABASE_URL no está configurada en Railway. Ve a tu servicio Next.js → Variables → Añade DATABASE_URL con la URL de tu base de datos MySQL.',
      instructions: {
        step1: 'Ve a tu servicio MySQL en Railway → Variables',
        step2: 'Copia la variable MYSQL_URL o DATABASE_URL',
        step3: 'Ve a tu servicio Next.js → Variables',
        step4: 'Añade o edita DATABASE_URL con la URL copiada',
        step5: 'Reinicia el servicio (Redeploy)',
        documentation: 'Consulta CONFIGURAR_DATABASE_URL.md para más detalles'
      },
      environment: {
        nodeEnv,
        port,
        hasDatabaseUrl: false
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
  
  try {
    // Intentar conectar a la base de datos
    await prisma.$connect()
    
    // Verificar que las tablas existan
    const listingsCount = await prisma.listing.count()
    const neighborhoodsCount = await prisma.neighborhood.count()
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: {
        nodeEnv,
        port,
        hasDatabaseUrl
      },
      database: {
        connected: true,
        tables: {
          listings: listingsCount,
          neighborhoods: neighborhoodsCount
        }
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error.message || 'Error de conexión',
      errorType: error.constructor?.name || 'Unknown',
      database: {
        connected: false,
        message: 'No se puede conectar a la base de datos. Verifica DATABASE_URL en Railway.'
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      // Ignorar errores al desconectar
    }
  }
}

