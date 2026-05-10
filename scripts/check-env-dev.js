#!/usr/bin/env node
/**
 * Se ejecuta SOLO antes de "npm run dev" (nunca en build ni en Vercel).
 * Comprueba que DATABASE_URL sea de desarrollo (Postgres local o rama Neon),
 * no la URL de producción remota antigua (FreeDB).
 */

const path = require('path')
const fs = require('fs')

if (process.env.NODE_ENV === 'production') {
  process.exit(0)
}

const root = path.resolve(__dirname, '..')
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const p = path.join(root, name)
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8')
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let val = match[2].trim()
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
        process.env[key] = val
      }
    })
  }
}

try {
  const { execSync } = require('child_process')
  execSync('lsof -iTCP:3000 -sTCP:LISTEN', { stdio: 'pipe' })
  console.warn('')
  console.warn('⚠️  El puerto 3000 ya está en uso (seguramente un `next dev` anterior).')
  console.warn('   Usá en la raíz del proyecto:  npm run dev:restart')
  console.warn('   o liberá el puerto:  kill $(lsof -ti:3000)')
  console.warn('')
} catch (_) {}

const url = process.env.DATABASE_URL || ''
const isPostgres =
  url.startsWith('postgres://') || url.startsWith('postgresql://')
const isMysql = url.startsWith('mysql://')

if (!isPostgres && !isMysql) {
  console.error('❌ DATABASE_URL no está definida o no es postgresql:// / mysql://')
  console.error('   En .env.development.local usá la URL de Neon (dev) o Postgres local.')
  process.exit(1)
}

if (isMysql) {
  console.error('❌ El proyecto usa PostgreSQL (Neon). Actualizá DATABASE_URL a postgresql://')
  process.exit(1)
}

if (url.includes('freedb.tech')) {
  console.error('❌ Estás en desarrollo pero DATABASE_URL apunta a FreeDB (producción).')
  console.error('   En local usá Neon (rama dev) o Postgres en localhost.')
  process.exit(1)
}

const looksDev =
  url.includes('localhost') ||
  url.includes('127.0.0.1') ||
  url.includes('neon.tech')

if (!looksDev) {
  console.error('⚠️  DATABASE_URL no parece de desarrollo (localhost / 127.0.0.1 / neon.tech).')
  console.error('   Para desarrollo usá una rama Neon o Postgres local en .env.development.local')
  process.exit(1)
}

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  console.warn('')
  console.warn(
    'ℹ️  NEXTAUTH_SECRET no está en .env: el siguiente paso (run-next-dev) usará un secreto solo para desarrollo local.'
  )
  console.warn('   Para fijar uno: en .env.local → openssl rand -base64 32')
  console.warn('')
}
