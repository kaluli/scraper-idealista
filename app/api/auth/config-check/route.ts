import { NextResponse } from 'next/server'
import { getAuthSecret } from '@/lib/auth-secret'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico seguro (sin exponer el secreto): abrí en el navegador
 * https://tu-dominio.vercel.app/api/auth/config-check
 * Si hasSecret es false, NEXTAUTH_SECRET no llega al servidor en Runtime.
 */
export async function GET() {
  const secret = getAuthSecret()
  return NextResponse.json({
    hasSecret: Boolean(secret && secret.length >= 16),
    secretChars: secret ? secret.length : 0,
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL || null,
    nodeEnv: process.env.NODE_ENV,
  })
}
