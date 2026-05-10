/**
 * NextAuth acepta NEXTAUTH_SECRET; Auth.js v5 también AUTH_SECRET.
 * Siempre trim (copiar/pegar desde Vercel a veces agrega espacio o salto de línea).
 */
export function getAuthSecret(): string | undefined {
  const s =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim()
  return s || undefined
}
