import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Reemplaza listings + neighborhoods en producción con el cuerpo enviado.
 * Protegido por FULL_SYNC_SECRET (misma variable en Vercel y al ejecutar el script local).
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const listings = Array.isArray(body.listings) ? body.listings : []
    const neighborhoods = Array.isArray(body.neighborhoods)
      ? body.neighborhoods
      : []

    await prisma.$transaction(async (tx) => {
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length > 0) {
        await tx.neighborhood.createMany({
          data: neighborhoods.map((n: Record<string, unknown>) => ({
            ...n,
            createdAt: new Date(String(n.createdAt)),
            updatedAt: new Date(String(n.updatedAt)),
          })),
        })
      }
      if (listings.length > 0) {
        await tx.listing.createMany({
          data: listings.map((l: Record<string, unknown>) => ({
            ...l,
            citaAt: l.citaAt ? new Date(String(l.citaAt)) : null,
            createdAt: new Date(String(l.createdAt)),
            updatedAt: new Date(String(l.updatedAt)),
          })),
        })
      }
    })

    return NextResponse.json({
      success: true,
      listings: listings.length,
      neighborhoods: neighborhoods.length,
    })
  } catch (error) {
    console.error('[full-sync]', error)
    const msg =
      error instanceof Error ? error.message : 'Error al aplicar sync'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
