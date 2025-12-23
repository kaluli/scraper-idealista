import { PrismaClient } from '@prisma/client'

// Limpiar DATABASE_URL de espacios ANTES de inicializar Prisma
// Railway a veces agrega espacios automáticamente al guardar variables
if (process.env.DATABASE_URL) {
  const originalUrl = process.env.DATABASE_URL
  const cleanedUrl = originalUrl.trim()
  
  // SIEMPRE limpiar, incluso si parece que no hay espacios
  // Esto asegura que funcione incluso si Railway agrega espacios invisibles
  process.env.DATABASE_URL = cleanedUrl
  
  if (originalUrl !== cleanedUrl) {
    console.log('[Prisma] ⚠️  Espacios detectados y eliminados de DATABASE_URL')
    console.log('[Prisma] Original length:', originalUrl.length, 'Cleaned length:', cleanedUrl.length)
  }
  
  // Verificar que empiece con mysql:// después de limpiar
  if (!process.env.DATABASE_URL.startsWith('mysql://')) {
    console.error('[Prisma] ❌ ERROR: DATABASE_URL no empieza con mysql:// después de limpiar')
    console.error('[Prisma] Primeros 30 caracteres:', JSON.stringify(process.env.DATABASE_URL.substring(0, 30)))
    console.error('[Prisma] Código del primer carácter:', process.env.DATABASE_URL.charCodeAt(0))
  } else {
    console.log('[Prisma] ✅ DATABASE_URL válida después de limpiar')
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Crear PrismaClient con la URL ya limpia
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

