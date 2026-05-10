import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 }),
    }
  }
  if (session.user.role !== 'admin') {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: 'Solo administradores' }, { status: 403 }),
    }
  }
  return { ok: true as const, session }
}
