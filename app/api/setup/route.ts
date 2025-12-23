import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Endpoint temporal para crear las tablas en Railway
 * POST /api/setup
 * 
 * ⚠️ IMPORTANTE: Elimina este endpoint después de usarlo por seguridad
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar conexión y crear tablas usando Prisma
    console.log('Verificando conexión con la base de datos...')
    
    // Intentar una consulta simple para verificar que las tablas existen
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se puede conectar a la base de datos. Verifica DATABASE_URL en Railway.' 
        },
        { status: 500 }
      )
    }
    
    // Ejecutar db:push usando Prisma
    const { execSync } = require('child_process')
    
    console.log('Creando tablas en la base de datos...')
    const result = execSync('npx prisma db push --skip-generate --accept-data-loss', {
      encoding: 'utf-8',
      env: process.env,
      stdio: 'pipe'
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tablas creadas correctamente',
      output: result
    })
  } catch (error: any) {
    console.error('Error creando tablas:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear las tablas',
        details: error.stdout || error.stderr
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

