import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthSecret } from '@/lib/auth-secret'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })
          if (!user) return null

          const ok = await bcrypt.compare(password, user.passwordHash)
          if (!ok) return null

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
          } catch {
            // No bloquear el login si falla el registro de último acceso
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name ?? undefined,
            role: user.role,
            province: user.province ?? null,
          }
        } catch (err) {
          console.error('[next-auth][credentials]', err)
          // Evita 500 en /api/auth si la BD no responde o falta la tabla users en prod
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
        token.province = (user as { province: string | null }).province ?? null
      } else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: parseInt(token.id as string, 10) },
            select: { role: true, province: true },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.province = dbUser.province ?? null
          }
        } catch {
          // no romper la sesión si la BD falla temporalmente
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = (token.role as UserRole) ?? 'user'
        session.user.province = (token.province as string | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    /** Evita quedar en /api/auth/error genérico; redirige al login con ?error=… */
    error: '/login',
  },
  secret: getAuthSecret(),
}
