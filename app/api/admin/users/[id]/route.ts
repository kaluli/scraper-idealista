import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

/** Cambiar rol o resetear contraseña. Solo administradores. */
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

  let body: { role?: string; resetPassword?: boolean; province?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 })
  }

  if (body.resetPassword) {
    try {
      const target = await prisma.user.findUnique({ where: { id } })
      if (!target) {
        return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
      }

      const passwordHash = await bcrypt.hash('Test1234', 12)
      await prisma.user.update({ where: { id }, data: { passwordHash } })
      return NextResponse.json({ success: true, message: 'Contraseña reseteada a Test1234' })
    } catch (e) {
      console.error('[PATCH /api/admin/users/[id] reset]', e)
      return NextResponse.json({ success: false, error: 'Error al resetear contraseña' }, { status: 500 })
    }
  }

  if (body.role !== 'user' && body.role !== 'admin' && !body.resetPassword && body.province === undefined) {
    return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 })
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.resetPassword) {
      const passwordHash = await bcrypt.hash('Test1234', 12)
      data.passwordHash = passwordHash
    }

    if (body.province !== undefined) {
      data.province = body.province || null
    }

    if (body.role) {
      const role = body.role
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Rol inválido' }, { status: 400 })
      }
      if (target.role === 'admin' && role === 'user') {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } })
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, error: 'Tiene que haber al menos un administrador.' },
            { status: 400 }
          )
        }
      }
      data.role = role
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        province: true,
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
