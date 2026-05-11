import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

/** Crear usuario manualmente. Solo administradores. */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  let body: { email?: string; password?: string; name?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const role = body.role === 'admin' ? 'admin' : 'user'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'Email no válido' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: 'La contraseña debe tener al menos 8 caracteres' },
      { status: 400 }
    )
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ success: false, error: 'Ese email ya está registrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const created = await prisma.user.create({
      data: { email, passwordHash, name: name || null, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true, lastLoginAt: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        lastLoginAt: null,
      },
    })
  } catch (e) {
    console.error('[POST /api/admin/users]', e)
    return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 500 })
  }
}

/** Lista usuarios (sin contraseñas). Solo administradores. */
export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      })),
    })
  } catch (e) {
    console.error('[GET /api/admin/users]', e)
    return NextResponse.json({ success: false, error: 'Error al listar usuarios' }, { status: 500 })
  }
}
