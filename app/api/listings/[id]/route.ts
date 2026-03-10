import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE - Eliminar un piso
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  try {
    await prisma.$connect()
    const id = parseInt(params.id)
    const body = await request.json()

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
    if (body.title !== undefined) data.title = body.title
    if (body.price !== undefined) data.price = parseFloat(body.price)
    if (body.surface !== undefined) data.surface = body.surface ? parseFloat(body.surface) : null
    if (body.link !== undefined) data.link = body.link
    if (body.profitabilityRate !== undefined) data.profitabilityRate = body.profitabilityRate ? parseFloat(body.profitabilityRate) : null
    if (body.type !== undefined) data.type = body.type
    if (body.neighborhood !== undefined) data.neighborhood = body.neighborhood
    if (body.city !== undefined) data.city = body.city
    if (body.publishedAddress !== undefined) data.publishedAddress = body.publishedAddress
    if (body.rooms !== undefined) data.rooms = body.rooms != null && body.rooms !== '' ? parseInt(body.rooms) : null
    if (body.citaAt !== undefined) {
      if (body.citaAt) {
        const citaDate = new Date(body.citaAt)
        data.citaAt = Number.isNaN(citaDate.getTime()) ? null : citaDate
      } else {
        data.citaAt = null
      }
    }
    if (body.contacto !== undefined) data.contacto = body.contacto === 'Juli' || body.contacto === 'Kalu' ? body.contacto : null
    if (body.phone !== undefined) data.phone = body.phone === '' ? null : String(body.phone)
    if (body.notas !== undefined) data.notas = body.notas === '' ? null : String(body.notas)

    const listing = await prisma.listing.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: listing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar el piso'
    console.error('Error updating listing:', error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

