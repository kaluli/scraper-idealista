import { NextResponse } from 'next/server'
import { getAuthSecret } from '@/lib/auth-secret'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico (sin mostrar el secreto): /api/auth/config-check
 * Detecta error típico: pegar el resultado de openssl en NEXTAUTH_URL en vez de NEXTAUTH_SECRET.
 */
export async function GET() {
  const secret = getAuthSecret()
  const rawUrl = process.env.NEXTAUTH_URL?.trim() || ''
  const urlLooksLikeHttps = /^https:\/\//i.test(rawUrl)
  /** Muchos pegan el base64 del secreto en la variable URL por error */
  const urlLooksLikeSecretInstead =
    Boolean(rawUrl) && !urlLooksLikeHttps && /^[A-Za-z0-9+/]+=*$/.test(rawUrl)

  let hint: string | null = null
  if (!secret && urlLooksLikeSecretInstead) {
    hint =
      'Parece que el valor largo (base64) está en NEXTAUTH_URL. Borrá esa variable o poné ahí https://tu-app.vercel.app. El mismo texto largo debe ir solo en NEXTAUTH_SECRET.'
  } else if (!secret) {
    hint =
      'Definí NEXTAUTH_SECRET en Vercel (Production) con openssl rand -base64 32 y redeploy.'
  } else if (rawUrl && !urlLooksLikeHttps) {
    hint =
      'NEXTAUTH_URL debe ser una URL https://… no otro tipo de texto.'
  }

  return NextResponse.json({
    hasSecret: Boolean(secret && secret.length >= 16),
    secretChars: secret ? secret.length : 0,
    /** Solo mostramos URL si parece URL (evita filtrar un secreto mal colocado) */
    nextAuthUrl: urlLooksLikeHttps ? rawUrl : rawUrl ? '(no es una URL https — revisá las variables)' : null,
    vercelUrl: process.env.VERCEL_URL || null,
    nodeEnv: process.env.NODE_ENV,
    urlLooksLikeSecretInstead,
    hint,
  })
}
