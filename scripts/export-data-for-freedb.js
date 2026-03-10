#!/usr/bin/env node
/**
 * Exporta SOLO los datos (INSERT) de tu MySQL local para importar en FreeDB.
 * Las tablas en FreeDB ya deben existir (npm run db:push con URL de FreeDB).
 *
 * 1. Asegurate de que .env.local tenga tu DATABASE_URL local (localhost).
 * 2. Ejecutá: node scripts/export-data-for-freedb.js
 * 3. Importá en FreeDB con el comando que se imprime al final.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function loadEnv() {
  const root = path.resolve(__dirname, '..')
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name)
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          if (process.env[key] === undefined || process.env[key] === '') {
            let val = match[2].trim()
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
            process.env[key] = val
          }
        }
      })
    }
  }
}

function parseDatabaseUrl(url) {
  if (!url || !url.startsWith('mysql://')) return null
  try {
    const at = url.indexOf('@')
    const slash = url.indexOf('/', at)
    if (at === -1 || slash === -1) return null
    const userPass = url.slice('mysql://'.length, at)
    const colon = userPass.indexOf(':')
    const user = colon === -1 ? userPass : decodeURIComponent(userPass.slice(0, colon))
    const password = colon === -1 ? '' : userPass.slice(colon + 1)
    const hostPort = url.slice(at + 1, slash)
    const db = url.slice(slash + 1).split('?')[0]
    const [host, port] = hostPort.includes(':') ? hostPort.split(':') : [hostPort, '3306']
    return {
      user,
      password: decodeURIComponent(password),
      host: host || 'localhost',
      port: port || '3306',
      database: db,
    }
  } catch {
    return null
  }
}

loadEnv()
const url = process.env.DATABASE_URL
const config = parseDatabaseUrl(url)

if (!config) {
  console.error('❌ No se encontró DATABASE_URL (mysql://...) en .env o .env.local')
  console.error('   Usá tu base LOCAL (localhost) para exportar los datos.')
  process.exit(1)
}

if (config.host.includes('freedb.tech')) {
  console.error('❌ DATABASE_URL apunta a FreeDB. Este script exporta desde tu MySQL LOCAL.')
  console.error('   En .env.local poné la URL de localhost, ej: mysql://root:password@localhost:3306/idealista_db')
  process.exit(1)
}

const root = path.resolve(__dirname, '..')
const outFile = path.join(root, 'data-for-freedb.sql')

console.log('📤 Exportando datos desde:', config.database, '@', config.host)
console.log('   Tablas: listings, neighborhoods')
console.log('   Salida:', path.basename(outFile))

try {
  if (config.password) process.env.MYSQL_PWD = config.password
  const cmd = [
    'mysqldump',
    '--user=' + config.user,
    '--host=' + config.host,
    '--port=' + config.port,
    '--no-create-info',
    '--complete-insert',
    '--no-tablespaces',
    '--set-gtid-purged=OFF',
    '--single-transaction',
    config.database,
    'listings',
    'neighborhoods',
  ]
  let out = execSync(cmd.join(' '), {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    cwd: root,
  })
  // Quitar la línea USE `base_local` para que al importar use la base con la que conectás (freedb_scraper)
  out = out.replace(/^USE `[^`]+`;\n?/, '')
  fs.writeFileSync(outFile, out)
  if (config.password) delete process.env.MYSQL_PWD
  const stat = fs.statSync(outFile)
  console.log('✅ Exportado:', path.basename(outFile), '(' + Math.round(stat.size / 1024) + ' KB)')
  console.log('')
  console.log('--- Importar en FreeDB (ejecutá en la terminal) ---')
  console.log('')
  console.log('mysql -h sql.freedb.tech -P 3306 -u freedb_kaluli -p freedb_scraper < data-for-freedb.sql')
  console.log('')
  console.log('Cuando pida la contraseña, pegá la de FreeDB.')
  console.log('')
} catch (e) {
  if (config.password) delete process.env.MYSQL_PWD
  console.error('❌ Error:', e.message || e)
  process.exit(1)
}
