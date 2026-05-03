import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const DB_ERROR_MESSAGE =
  'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → DATABASE_URL (PostgreSQL / Neon).'

/** Convierte unknown a string | null para asignar a UpdateData sin errores de tipo. */
function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return String(v)
}

// DELETE - Eliminar un piso
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE },
      { status: 500 }
    )
  }
  try {
    await prisma.$connect()
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      )
    }

    await prisma.listing.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Piso eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el piso' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un piso
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { success: false, error: DB_ERROR_MESSAGE },
      { status: 500 }
    )
  }
  try {
    await prisma.$connect()
    const id = parseInt(params.id)
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Cuerpo de la petición inválido o vacío (JSON)' },
        { status: 400 }
      )
    }
    if (typeof body !== 'object' || body === null) body = {}

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      )
    }

    type UpdateData = Prisma.ListingUpdateInput
    const data: UpdateData = {}
    if (body.title !== undefined) {
      const v = strOrNull(body.title)
      data.title = v
    }
    if (body.price !== undefined) {
      const v = parseFloat(String(body.price))
      data.price = v
    }
    if (body.surface !== undefined) {
      const v = body.surface ? parseFloat(String(body.surface)) : null
      data.surface = v
    }
    if (body.link !== undefined) {
      const v = strOrNull(body.link)
      data.link = v !== null ? v : undefined
    }
    if (body.profitabilityRate !== undefined) {
      const v = body.profitabilityRate ? parseFloat(String(body.profitabilityRate)) : null
      data.profitabilityRate = v
    }
    if (body.type !== undefined) {
      const v = strOrNull(body.type)
      data.type = v !== null ? v : undefined
    }
    if (body.neighborhood !== undefined) {
      const v = strOrNull(body.neighborhood)
      data.neighborhood = v
    }
    if (body.city !== undefined) {
      const v = strOrNull(body.city)
      data.city = v
    }
    if (body.province !== undefined) {
      const v = strOrNull(body.province)
      data.province = v
    }
    if (body.publishedAddress !== undefined) {
      const v = strOrNull(body.publishedAddress)
      data.publishedAddress = v
    }
    if (body.rooms !== undefined) {
      const v = body.rooms != null && body.rooms !== '' ? parseInt(String(body.rooms)) : null
      data.rooms = v
    }
    if (body.citaAt !== undefined) {
      if (body.citaAt) {
        const citaDate = new Date(body.citaAt as string)
        data.citaAt = Number.isNaN(citaDate.getTime()) ? null : citaDate
      } else {
        data.citaAt = null
      }
    }
    if (body.contacto !== undefined) {
      const v = body.contacto === 'Juli' || body.contacto === 'Kalu' ? (body.contacto as string) : null
      data.contacto = v
    }
    // phone: siempre string; puede tener números, espacios, etc. Solo null si viene vacío.
    if (body.phone !== undefined) {
      const raw =
        body.phone === null || body.phone === '' ? null : String(body.phone)
      data.phone = { set: raw }
    }
    if (body.notas !== undefined) {
      const v = body.notas === '' ? null : String(body.notas)
      data.notas = v
    }
    if (body.llamado !== undefined) {
      data.llamado = { set: Boolean(body.llamado) }
    }
    if (body.visitado !== undefined) {
      data.visitado = { set: Boolean(body.visitado) }
    }

    // Quitar claves undefined para que Prisma no rechace el update
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Prisma.ListingUpdateInput

    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No hay campos que actualizar. Si editaste solo un campo, recargá la página e inténtalo de nuevo.',
        },
        { status: 400 }
      )
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: cleanData,
    })

    return NextResponse.json({ success: true, data: listing })
  } catch (error) {
    const raw =
      error instanceof Error
        ? error.message
        : error === undefined || error === null
          ? 'Error desconocido'
          : String(error)
    try {
      console.error('[PUT /api/listings/[id]]', raw)
    } catch {
      /* no bloquear respuesta JSON */
    }
    const hint = /notas|telefono|llamado|Unknown column|doesn'?t exist|Column .* (cannot|does not)|P2022|no column|no such column/i.test(
      raw
    )
      ? ' → Sincronizá el esquema: npm run db:push (o npx prisma db push con la misma DATABASE_URL que la app).'
      : ''
    return NextResponse.json(
      { success: false, error: `${raw}${hint}` },
      { status: 500 }
    )
  }
}

