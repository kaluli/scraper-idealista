import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

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
