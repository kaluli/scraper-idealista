import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const userId = parseInt(session.user.id, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, province: true },
    })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true, user })
  } catch (e) {
    console.error('[GET profile]', e)
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const userId = parseInt(session.user.id, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Sesión inválida' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : undefined
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : undefined

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    const data: { name?: string | null; passwordHash?: string; province?: string | null } = {}

    if (name !== undefined) {
      data.name = name || null
    }

    if (body.province !== undefined) {
      data.province = body.province === 'all' || body.province === '' ? null : body.province
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        )
      }
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return NextResponse.json(
          { success: false, error: 'Contraseña actual incorrecta' },
          { status: 400 }
        )
      }
      data.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Nada que actualizar' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data,
    })

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: data.name !== undefined ? data.name : user.name,
        province: data.province !== undefined ? data.province : user.province,
      },
    })
  } catch (e) {
    console.error('[profile]', e)
    return NextResponse.json({ success: false, error: 'Error al guardar' }, { status: 500 })
  }
}
