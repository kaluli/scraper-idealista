#!/usr/bin/env node
/**
 * Misma carga de .env que import-json y la app en dev.
 * Muestra a qué Postgres (Neon) te conectás y cuántos listings hay.
 *
 * Uso: node scripts/db-status.js   o   npm run db:status
 */

const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) continue
  fs.readFileSync(p, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (!match) return
      const key = match[1].trim()
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key] = val
    })
}

function formatDbTarget(url) {
  if (!url || typeof url !== 'string') return '(DATABASE_URL no definida)'
  try {
    const normalized = url
      .replace(/^mysql:\/\//i, 'http://')
      .replace(/^postgres(ql)?:\/\//i, 'http://')
    const u = new URL(normalized)
    const db = u.pathname.replace(/^\//, '').split('?')[0] || '(sin nombre)'
    const port = u.port || (url.startsWith('mysql') ? '3306' : '5432')
    return `${u.hostname}:${port}/${db}`
  } catch {
    return '(URL no válida)'
  }
}

const { PrismaClient } = require('@prisma/client')

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log('📍 Destino (misma regla que import-json / npm run dev):')
  console.log('   ', formatDbTarget(url))
  console.log('   ', url.replace(/:[^:@]+@/, ':****@'))
  console.log('')
  const isPg =
    url.startsWith('postgres://') || url.startsWith('postgresql://')
  if (!isPg) {
    console.error('❌ DATABASE_URL no es postgresql://')
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const n = await prisma.listing.count()
    const m = await prisma.neighborhood.count()
    console.log(`📊 En esta base: ${n} pisos (listings), ${m} filas en barrios (neighborhoods).`)
    if (n === 0) {
      console.log('')
      console.log('💡 Si importaste desde la web en Vercel, los datos están en PRODUCCIÓN, no aquí.')
      console.log('   Para copiarlos a local: npm run db:sync-from-prod')
      console.log('')
      console.log('💡 Si usaste npm run db:import-all, hace falta tener los JSON en la raíz del proyecto')
      console.log('   (pisos.json, pisos_espinardo.json, …).')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
