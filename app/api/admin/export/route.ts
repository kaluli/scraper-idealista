import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Exporta listings + neighborhoods desde la BD de producción (solo lectura).
 * Misma autenticación que POST /api/admin/full-sync (FULL_SYNC_SECRET).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.FULL_SYNC_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          'FULL_SYNC_SECRET no está definido en el servidor (Vercel → Environment Variables).',
      },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization')
  const bearer =
    auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerSecret = request.headers.get('x-full-sync-secret')?.trim() ?? ''
  const provided = bearer || headerSecret
  if (provided !== secret) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const [listings, neighborhoods] = await Promise.all([
      prisma.listing.findMany({ orderBy: { id: 'asc' } }),
      prisma.neighborhood.findMany({ orderBy: { id: 'asc' } }),
    ])

    return NextResponse.json({
      success: true,
      listings,
      neighborhoods,
    })
  } catch (error) {
    console.error('[admin/export]', error)
    const msg =
      error instanceof Error ? error.message : 'Error al exportar'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
