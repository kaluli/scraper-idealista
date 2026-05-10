import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DB_ERROR_MESSAGE =
  'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → DATABASE_URL (PostgreSQL / Neon).'

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return String(v)
}

function mergeRow(
  listing: Record<string, unknown>,
  state:
    | {
        citaAt: Date | null
        contacto: string | null
        phone: string | null
        notas: string | null
        llamado: boolean
        visitado: boolean
      }
    | undefined
    | null
) {
  return {
    ...listing,
    citaAt: state?.citaAt ? state.citaAt.toISOString() : null,
    contacto: state?.contacto ?? null,
    phone: state?.phone ?? null,
    notas: state?.notas ?? null,
    llamado: state?.llamado ?? false,
    visitado: state?.visitado ?? false,
  }
}

/** Ocultar en Contactos para este usuario (no borra el listing global). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const userId = parseInt(session.user.id, 10)
  const id = parseInt(params.id, 10)

  if (Number.isNaN(userId) || Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    await prisma.$connect()
    const listing = await prisma.listing.findUnique({ where: { id } })
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Piso no encontrado' }, { status: 404 })
    }

    await prisma.userListingState.upsert({
      where: {
        userId_listingId: { userId, listingId: id },
      },
      create: {
        userId,
        listingId: id,
        hiddenAt: new Date(),
      },
      update: {
        hiddenAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Piso oculto de tu lista de contactos',
    })
  } catch (error) {
    console.error('[DELETE /api/contactos/listings/[id]]', error)
    return NextResponse.json({ success: false, error: DB_ERROR_MESSAGE }, { status: 500 })
  }
}

/** Actualizar datos del catálogo (compartidos) + seguimiento del usuario actual. */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const userId = parseInt(session.user.id, 10)
  const id = parseInt(params.id, 10)

  if (Number.isNaN(userId) || Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    await prisma.$connect()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null) body = {}

    const existing = await prisma.listing.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Piso no encontrado' }, { status: 404 })
    }

    const listingData: Prisma.ListingUpdateInput = {}

    if (body.title !== undefined) listingData.title = strOrNull(body.title)
    if (body.price !== undefined) listingData.price = parseFloat(String(body.price))
    if (body.surface !== undefined) {
      listingData.surface = body.surface ? parseFloat(String(body.surface)) : null
    }
    if (body.link !== undefined) {
      const v = strOrNull(body.link)
      listingData.link = v !== null ? v : undefined
    }
    if (body.profitabilityRate !== undefined) {
      listingData.profitabilityRate = body.profitabilityRate
        ? parseFloat(String(body.profitabilityRate))
        : null
    }
    if (body.type !== undefined) {
      const v = strOrNull(body.type)
      listingData.type = v !== null ? v : undefined
    }
    if (body.neighborhood !== undefined) listingData.neighborhood = strOrNull(body.neighborhood)
    if (body.city !== undefined) listingData.city = strOrNull(body.city)
    if (body.province !== undefined) listingData.province = strOrNull(body.province)
    if (body.publishedAddress !== undefined) {
      listingData.publishedAddress = strOrNull(body.publishedAddress)
    }
    if (body.rooms !== undefined) {
      listingData.rooms =
        body.rooms != null && body.rooms !== '' ? parseInt(String(body.rooms), 10) : null
    }

    const cleanListing = Object.fromEntries(
      Object.entries(listingData).filter(([, v]) => v !== undefined)
    ) as Prisma.ListingUpdateInput

    let listingRow = existing
    if (Object.keys(cleanListing).length > 0) {
      listingRow = await prisma.listing.update({
        where: { id },
        data: cleanListing,
      })
    }

    const hasUserFields =
      body.citaAt !== undefined ||
      body.contacto !== undefined ||
      body.phone !== undefined ||
      body.notas !== undefined ||
      body.llamado !== undefined ||
      body.visitado !== undefined

    let stateRow = await prisma.userListingState.findUnique({
      where: { userId_listingId: { userId, listingId: id } },
    })

    if (hasUserFields) {
      const prev = stateRow
      let citaAt = prev?.citaAt ?? null
      if (body.citaAt !== undefined) {
        if (body.citaAt) {
          const citaDate = new Date(body.citaAt as string)
          citaAt = Number.isNaN(citaDate.getTime()) ? null : citaDate
        } else {
          citaAt = null
        }
      }

      let contacto = prev?.contacto ?? null
      if (body.contacto !== undefined) {
        contacto =
          body.contacto === 'Juli' || body.contacto === 'Kalu' ? (body.contacto as string) : null
      }

      let phone = prev?.phone ?? null
      if (body.phone !== undefined) {
        phone = body.phone === null || body.phone === '' ? null : String(body.phone)
      }

      let notas = prev?.notas ?? null
      if (body.notas !== undefined) {
        notas = body.notas === '' ? null : String(body.notas)
      }

      let llamado = prev?.llamado ?? false
      if (body.llamado !== undefined) llamado = Boolean(body.llamado)

      let visitado = prev?.visitado ?? false
      if (body.visitado !== undefined) visitado = Boolean(body.visitado)

      stateRow = await prisma.userListingState.upsert({
        where: { userId_listingId: { userId, listingId: id } },
        create: {
          userId,
          listingId: id,
          citaAt,
          contacto,
          phone,
          notas,
          llamado,
          visitado,
        },
        update: {
          citaAt,
          contacto,
          phone,
          notas,
          llamado,
          visitado,
        },
      })
    }

    const plain = JSON.parse(JSON.stringify(listingRow)) as Record<string, unknown>
    return NextResponse.json({
      success: true,
      data: mergeRow(plain, stateRow),
    })
  } catch (error) {
    const raw =
      error instanceof Error
        ? error.message
        : error === undefined || error === null
          ? 'Error desconocido'
          : String(error)
    console.error('[PUT /api/contactos/listings/[id]]', raw)
    return NextResponse.json({ success: false, error: `${raw}` }, { status: 500 })
  }
}
