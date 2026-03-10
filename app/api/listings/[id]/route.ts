import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DB_ERROR_MESSAGE = 'No se pudo conectar a la base de datos. En Vercel: Settings → Environment Variables → añadí DATABASE_URL (MySQL de producción).'

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

    type UpdateData = {
      title?: string | null
      price?: number
      surface?: number | null
      link?: string
      profitabilityRate?: number | null
      type?: string
      neighborhood?: string | null
      city?: string | null
      province?: string | null
      publishedAddress?: string | null
      rooms?: number | null
      citaAt?: Date | null
      contacto?: string | null
      phone?: string | null
      notas?: string | null
    }
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
    if (body.phone !== undefined) {
      const v = body.phone === '' ? null : String(body.phone)
      data.phone = v
    }
    if (body.notas !== undefined) {
      const v = body.notas === '' ? null : String(body.notas)
      data.notas = v
    }

    const listing = await prisma.listing.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: listing })
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    console.error('Error updating listing:', error)
    const hint =
      /telefono|Unknown column|doesn't exist/i.test(raw)
        ? ' Ejecutá en local: npm run db:push'
        : ''
    return NextResponse.json(
      { success: false, error: raw + hint },
      { status: 500 }
    )
  }
}

