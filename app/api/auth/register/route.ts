import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ success: false, error: 'Email no válido' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const exists = await prisma.user.findUnique({ where: { email: emailRaw } })
    if (exists) {
      return NextResponse.json({ success: false, error: 'Ese email ya está registrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userCount = await prisma.user.count()
    await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        name: name || null,
        role: userCount === 0 ? 'admin' : 'user',
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ success: false, error: 'No se pudo registrar' }, { status: 500 })
  }
}
