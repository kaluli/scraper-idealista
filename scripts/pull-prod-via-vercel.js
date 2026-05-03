#!/usr/bin/env node
/**
 * Copia PRODUCCIÓN → LOCAL sin abrir el puerto de la BD (HTTP /api/admin/export).
 * GET https://tu-app.vercel.app/api/admin/export (mismo secreto que full-sync).
 *
 * Requiere:
 *   .env.development.local    → DATABASE_URL local (postgresql://…)
 *   .env.full-sync.local      → VERCEL_APP_URL, FULL_SYNC_SECRET (igual que Vercel)
 *
 * Uso: npm run db:pull-vercel
 *      npm run db:pull-vercel -- https://tu-app.vercel.app
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const root = path.resolve(__dirname, '..')

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return
  const content = fs.readFileSync(p, 'utf8')
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    process.env[key] = val
  })
}

parseEnvFile(path.join(root, '.env.full-sync.local'))
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  parseEnvFile(path.join(root, name))
}

const baseUrl = (process.argv[2] || process.env.VERCEL_APP_URL || '').replace(/\/$/, '')
const secret = (process.env.FULL_SYNC_SECRET || '').trim()
const localUrl = (process.env.DATABASE_URL || '').trim()

if (!baseUrl) {
  console.error('❌ Definí VERCEL_APP_URL en .env.full-sync.local o pasá la URL:')
  console.error('   npm run db:pull-vercel -- https://tu-app.vercel.app')
  process.exit(1)
}
if (!secret) {
  console.error('❌ Definí FULL_SYNC_SECRET en .env.full-sync.local (mismo valor que en Vercel).')
  process.exit(1)
}
const localPg =
  localUrl.startsWith('postgresql://') || localUrl.startsWith('postgres://')
const localOk =
  localUrl.includes('localhost') ||
  localUrl.includes('127.0.0.1') ||
  localUrl.includes('neon.tech')
if (!localPg || !localOk) {
  console.error(
    '❌ DATABASE_URL local postgresql:// en .env.development.local (localhost o neon.tech)'
  )
  process.exit(1)
}

function getJson(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, json: JSON.parse(raw) })
          } catch {
            resolve({ status: res.statusCode || 0, text: raw })
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

const { PrismaClient } = require('@prisma/client')
const prismaLocal = new PrismaClient({ datasources: { db: { url: localUrl } } })

async function main() {
  const endpoint = `${baseUrl}/api/admin/export`
  console.log('📥 Producción (Vercel) → Local vía', endpoint, '\n')

  let listings = []
  let neighborhoods = []

  try {
    const res = await getJson(endpoint)
    if (!res.json?.success || !Array.isArray(res.json.listings)) {
      console.error('❌ Respuesta:', res.status, res.json || res.text)
      process.exit(1)
    }
    listings = res.json.listings
    neighborhoods = res.json.neighborhoods || []
    console.log('   Descargado: listings', listings.length, '| neighborhoods', neighborhoods.length)
  } catch (e) {
    console.error('❌ Error HTTP:', e.message)
    process.exit(1)
  }

  try {
    console.log('\n   Escribiendo en Postgres local...')
    await prismaLocal.$transaction(async (tx) => {
      await tx.listing.deleteMany({})
      await tx.neighborhood.deleteMany({})
      if (neighborhoods.length) {
        await tx.neighborhood.createMany({
          data: neighborhoods.map((n) => ({
            ...n,
            createdAt: new Date(String(n.createdAt)),
            updatedAt: new Date(String(n.updatedAt)),
          })),
        })
      }
      if (listings.length) {
        await tx.listing.createMany({
          data: listings.map((l) => ({
            ...l,
            citaAt: l.citaAt ? new Date(String(l.citaAt)) : null,
            createdAt: new Date(String(l.createdAt)),
            updatedAt: new Date(String(l.updatedAt)),
          })),
        })
      }
    })
    await prismaLocal.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1))
    `)
    await prismaLocal.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('neighborhoods', 'id'), COALESCE((SELECT MAX(id) FROM neighborhoods), 1))
    `)
    await prismaLocal.$disconnect()
    console.log('   ✅ Local actualizado.')
  } catch (e) {
    await prismaLocal.$disconnect().catch(() => {})
    console.error('❌ Error escribiendo en local:', e.message)
    process.exit(1)
  }

  console.log('\n✅ Copia lista. Producción → localhost.\n')
}

main()
