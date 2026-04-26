#!/usr/bin/env node
/**
 * Se ejecuta SOLO antes de "npm run dev" (nunca en build ni en Vercel).
 * Comprueba que DATABASE_URL sea de desarrollo (localhost), no de producción (freedb.tech).
 */

const path = require('path')
const fs = require('fs')

// En producción (build/deploy) no hacemos ningún check; solo en desarrollo
if (process.env.NODE_ENV === 'production') {
  process.exit(0)
}

const root = path.resolve(__dirname, '..')
// Mismo orden que Next.js en desarrollo: .env, .env.local, .env.development, .env.development.local
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
} catch (_) {
  // nadie escuchando en 3000
}

const url = process.env.DATABASE_URL || ''
if (!url.startsWith('mysql://')) {
  console.error('❌ DATABASE_URL no está definida o no es mysql://')
  console.error('   Creá .env.development.local a partir de .env.development.local.example')
  console.error('   con la URL de tu MySQL local (localhost).')
  process.exit(1)
}

if (url.includes('freedb.tech')) {
  console.error('❌ Estás en desarrollo pero DATABASE_URL apunta a FreeDB (producción).')
  console.error('   En local tenés que usar SOLO tu MySQL local.')
  console.error('')
  console.error('   Editá .env.development.local (no .env.local) y poné:')
  console.error('   DATABASE_URL="mysql://root@localhost:3306/idealista_db"')
  console.error('')
  console.error('   No uses la URL de FreeDB en ningún archivo cuando trabajás en local.')
  process.exit(1)
}

if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
  console.error('⚠️  DATABASE_URL no parece ser local (localhost/127.0.0.1).')
  console.error('   Para desarrollo usá siempre tu MySQL local en .env.development.local')
  process.exit(1)
}
