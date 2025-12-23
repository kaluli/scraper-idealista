import { PrismaClient } from '@prisma/client'

// Limpiar DATABASE_URL de espacios ANTES de inicializar Prisma
// Railway a veces agrega espacios automáticamente
if (process.env.DATABASE_URL) {
  const originalUrl = process.env.DATABASE_URL
  const cleanedUrl = originalUrl.trim()
  if (originalUrl !== cleanedUrl) {
    console.log('[Prisma] Limpiando espacios de DATABASE_URL')
    process.env.DATABASE_URL = cleanedUrl
  }
  
  // Verificar que empiece con mysql://
  if (!process.env.DATABASE_URL.startsWith('mysql://')) {
    console.error('[Prisma] ERROR: DATABASE_URL no empieza con mysql://')
    console.error('[Prisma] URL recibida:', JSON.stringify(process.env.DATABASE_URL.substring(0, 20)))
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

