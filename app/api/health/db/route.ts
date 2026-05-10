import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico de conexión a la base de datos (solo administradores).
 * Útil para verificar DATABASE_URL en Vercel.
 * GET /api/health/db
 */
export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

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
    if (
      msg.includes('must start with the protocol') ||
      msg.includes('Validation Error')
    ) {
      diagnostico =
        'DATABASE_URL no coincide con el provider de Prisma en el código desplegado.'
    } else if (msg.includes('max_connections') || msg.includes('exceeded')) {
      diagnostico =
        'Límite de conexiones alcanzado en la base. Esperá unos minutos o revisá el plan.'
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      diagnostico =
        'No se puede alcanzar el servidor de la base de datos. Verificá host y puerto.'
    } else if (msg.includes('Access denied') || msg.includes('ER_ACCESS_DENIED')) {
      diagnostico =
        'Usuario o contraseña incorrectos en DATABASE_URL.'
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
        solucion:
          'Con Neon (postgresql://): el deploy debe incluir prisma/schema.prisma con provider = "postgresql". Hacé push del repo y Redeploy en Vercel. Luego: DATABASE_URL de Neon y `npx prisma db push` contra esa URL.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
