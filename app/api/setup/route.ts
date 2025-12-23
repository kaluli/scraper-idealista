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
    // Ejecutar db:push programáticamente
    const { execSync } = require('child_process')
    
    console.log('Creando tablas en la base de datos...')
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tablas creadas correctamente' 
    })
  } catch (error: any) {
    console.error('Error creando tablas:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al crear las tablas' 
      },
      { status: 500 }
    )
  }
}

