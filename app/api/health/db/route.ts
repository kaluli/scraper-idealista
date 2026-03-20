import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico de conexión a la base de datos.
 * Útil para verificar DATABASE_URL en Vercel.
 * GET /api/health/db
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  const hasUrl = !!dbUrl?.trim()
  const urlLength = dbUrl?.length ?? 0

  if (!hasUrl) {
    return NextResponse.json(
      {
        ok: false,
        diagnostico: 'DATABASE_URL no está definida o está vacía',
        detalles: {
          hasDatabaseUrl: false,
          urlLength: 0,
        },
        solucion: 'Vercel → Settings → Environment Variables → añadí DATABASE_URL. Luego Redeploy.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    await prisma.$connect()
    const count = await prisma.listing.count()

    return NextResponse.json(
      {
        ok: true,
        diagnostico: 'Conexión OK',
        detalles: {
          hasDatabaseUrl: true,
          urlLength,
          connected: true,
          listingsCount: count,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const err = error as Error
    const msg = err.message || String(error)

    let diagnostico = 'Error al conectar'
    if (msg.includes('max_connections') || msg.includes('exceeded')) {
      diagnostico = 'Límite de conexiones de FreeDB alcanzado (100/hora). Esperá unos minutos.'
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      diagnostico = 'No se puede alcanzar el servidor de la base de datos. Verificá host y puerto.'
    } else if (msg.includes('Access denied') || msg.includes('ER_ACCESS_DENIED')) {
      diagnostico = 'Usuario o contraseña incorrectos. Verificá las credenciales en FreeDB.'
    } else if (msg.includes('Unknown database')) {
      diagnostico = 'La base de datos no existe. Verificá el nombre en la URL.'
    }

    return NextResponse.json(
      {
        ok: false,
        diagnostico,
        detalles: {
          hasDatabaseUrl: true,
          urlLength,
          connected: false,
          errorMessage: msg,
        },
        solucion: 'Revisá DATABASE_URL en Vercel. Si usás FreeDB, verificá que la base esté activa en freedb.tech.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
