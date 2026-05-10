import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Evitar espacios en DATABASE_URL que rompen la conexión (p. ej. al pegar en Vercel)
if (typeof process.env.DATABASE_URL === 'string') {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim()
}

/** Una sola instancia también en producción (Vercel serverless / Neon). */
function createPrisma() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrisma()
}

export const prisma = globalForPrisma.prisma

