import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Evitar espacios en DATABASE_URL que rompen la conexión
if (typeof process.env.DATABASE_URL === 'string') {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim()
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

