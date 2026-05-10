import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

/** Cambiar rol de un usuario. Solo administradores. No se puede dejar 0 admins. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 })
  }

  const role = body.role
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Rol inválido' }, { status: 400 })
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (target.role === 'admin' && role === 'user') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tiene que haber al menos un administrador. Nombrá otro admin antes de quitar este.',
          },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error('[PATCH /api/admin/users/[id]]', e)
    return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 })
  }
}
