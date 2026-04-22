#!/usr/bin/env node
/**
 * Copia datos de MySQL LOCAL → base de PRODUCCIÓN vía HTTPS (sin abrir puerto 3306 desde esta red).
 *
 * Requiere el deploy en Vercel con POST /api/admin/full-sync y FULL_SYNC_SECRET en env.
 *
 * 1. En Vercel: añadí FULL_SYNC_SECRET (valor largo aleatorio) y redeploy.
 * 2. Local (misma terminal):
 *    FULL_SYNC_SECRET=tu_secreto npm run db:push-vercel -- https://tu-proyecto.vercel.app
 *
 * Lee DATABASE_URL local desde .env.development.local (como npm run dev).
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

function loadDevEnv() {
  for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    parseEnvFile(path.join(root, name))
  }
}

/** Secreto y URL de Vercel (no commitear; .env*.local en .gitignore) */
function loadFullSyncEnv() {
  parseEnvFile(path.join(root, '.env.full-sync.local'))
}

loadFullSyncEnv()
loadDevEnv()

const baseUrl = (process.argv[2] || process.env.VERCEL_APP_URL || '').replace(/\/$/, '')
const secret = (process.env.FULL_SYNC_SECRET || '').trim()

if (!baseUrl) {
  console.error('❌ Definí VERCEL_APP_URL en .env.full-sync.local o pasá la URL:')
  console.error('   npm run db:push-vercel -- https://tu-app.vercel.app')
  process.exit(1)
}
if (!secret) {
  console.error('❌ Definí FULL_SYNC_SECRET en .env.full-sync.local (mismo valor en Vercel).')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const url = process.env.DATABASE_URL || ''
if (!url.startsWith('mysql://') || (!url.includes('localhost') && !url.includes('127.0.0.1'))) {
  console.error('❌ DATABASE_URL local (localhost) no encontrada en .env.development.local')
  process.exit(1)
}

const prismaLocal = new PrismaClient({ datasources: { db: { url } } })

function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const lib = u.protocol === 'https:' ? https : http
    const data = Buffer.from(JSON.stringify(body), 'utf8')
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
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
    req.write(data)
    req.end()
  })
}

async function main() {
  console.log('📤 Local → Producción vía', `${baseUrl}/api/admin/full-sync\n`)

  let listings = []
  let neighborhoods = []

  try {
    const [l, n] = await Promise.all([
      prismaLocal.listing.findMany({ orderBy: { id: 'asc' } }),
      prismaLocal.neighborhood.findMany({ orderBy: { id: 'asc' } }),
    ])
    listings = l
    neighborhoods = n
    await prismaLocal.$disconnect()
    console.log('   Local: listings', listings.length, '| neighborhoods', neighborhoods.length)
  } catch (e) {
    await prismaLocal.$disconnect().catch(() => {})
    console.error('❌ Error leyendo local:', e.message)
    process.exit(1)
  }

  const endpoint = `${baseUrl}/api/admin/full-sync`
  try {
    const res = await postJson(endpoint, { listings, neighborhoods })
    if (res.json?.success) {
      console.log('\n✅ Producción actualizada:', res.json)
      return
    }
    console.error('❌ Respuesta:', res.status, res.json || res.text)
    process.exit(1)
  } catch (e) {
    console.error('❌ Error HTTP:', e.message)
    process.exit(1)
  }
}

main()
