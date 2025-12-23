import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE - Eliminar un piso
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const id = parseInt(params.id)
    const body = await request.json()

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      )
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.price && { price: parseFloat(body.price) }),
        ...(body.surface && { surface: parseFloat(body.surface) }),
        ...(body.link && { link: body.link }),
        ...(body.profitabilityRate && { profitabilityRate: parseFloat(body.profitabilityRate) }),
        ...(body.type && { type: body.type }),
        ...(body.neighborhood && { neighborhood: body.neighborhood }),
        ...(body.city && { city: body.city }),
      },
    })

    return NextResponse.json({ success: true, data: listing })
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el piso' },
      { status: 500 }
    )
  }
}

