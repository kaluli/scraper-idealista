import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

/** Env de Vercel debe leerse en runtime, no cachear respuesta de sesión. */
export const dynamic = 'force-dynamic'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
