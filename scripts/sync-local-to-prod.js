#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const root = path.resolve(__dirname, '..')

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      env[key] = val
    }
  })
  return env
}

function resolveProdUrl() {
  const fromEnv = (process.env.SYNC_PROD_DATABASE_URL || '').trim()
  if (fromEnv) return fromEnv
  const chain = [
    '.env.sync.vercel.prod',
    '.env.production.local',
    '.env.production',
    '.env.vercel.pulled',
  ]
  for (const name of chain) {
    const env = readEnvFile(path.join(root, name))
    const u = (env.DATABASE_URL || '').trim()
    if (u) return u
  }
  return ''
}

function resolveLocalUrl() {
  const fromEnv = (process.env.SYNC_LOCAL_DATABASE_URL || '').trim()
  if (fromEnv) return fromEnv
  const dev = readEnvFile(path.join(root, '.env.development.local'))
  const loc = readEnvFile(path.join(root, '.env.local'))
  return (dev.DATABASE_URL || loc.DATABASE_URL || '').trim()
}

const localUrl = resolveLocalUrl()
const prodUrl = resolveProdUrl()

if (!localUrl || !prodUrl) {
  console.error('❌ Faltan DATABASE_URL de local o producción.')
  process.exit(1)
}

if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
  console.error('❌ La URL de producción no puede ser localhost.')
  process.exit(1)
}

if (localUrl === prodUrl) {
  console.error('❌ Local y producción tienen la misma URL.')
  process.exit(1)
}

async function main() {
  console.log('📤 Sync PRODUCCIÓN ← LOCAL\n')

  // 1. Leer de local
  console.log('📖 Leyendo desde local...')
  const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } })
  const [listings, neighborhoods, users] = await Promise.all([
    prismaLocal.listing.findMany({ orderBy: { id: 'asc' } }),
    prismaLocal.neighborhood.findMany({ orderBy: { id: 'asc' } }),
    prismaLocal.user.findMany({ orderBy: { id: 'asc' } }),
  ])
  await prismaLocal.$disconnect()
  console.log('   Listings:', listings.length)
  console.log('   Neighborhoods:', neighborhoods.length)
  console.log('   Users:', users.length)

  // 2. Escribir en producción
  console.log('\n✍️  Escribiendo en producción (Neon)...')
  const prismaProd = new PrismaClient({ datasources: { db: { url: prodUrl } } })

  try {
    await prismaProd.$transaction(async (tx) => {
      await tx.userListingState.deleteMany({})
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) await tx.neighborhood.createMany({ data: neighborhoods })
      if (listings.length) await tx.listing.createMany({ data: listings })
    })

    await prismaProd.$executeRawUnsafe(
      "SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1))"
    )
    await prismaProd.$executeRawUnsafe(
      "SELECT setval(pg_get_serial_sequence('neighborhoods', 'id'), COALESCE((SELECT MAX(id) FROM neighborhoods), 1))"
    )

    // Sincronizar usuarios (upsert para no romper si ya existen)
    for (const u of users) {
      await prismaProd.user.upsert({
        where: { id: u.id },
        create: u,
        update: u,
      })
    }

    console.log('   ✅ Producción actualizada.')
  } catch (e) {
    console.error('❌ Error escribiendo en producción:', e.message)
    process.exit(1)
  } finally {
    await prismaProd.$disconnect()
  }

  console.log('\n✅ Sync completado: local → producción.')
}

main()
