#!/usr/bin/env node
/**
 * Backup de la base de datos de PRODUCCIÓN (FreeDB).
 * Usa DATABASE_URL de .env.production.
 *
 * Uso: node scripts/backup-prod.js
 * Salida: backup-prod-idealista-YYYY-MM-DD-HHmmss.sql
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.production')

if (!fs.existsSync(envPath)) {
  console.error('❌ No existe .env.production')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
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

function parseDatabaseUrl(url) {
  if (!url || !url.startsWith('mysql://')) return null
  try {
    const at = url.indexOf('@')
    const slash = url.indexOf('/', at)
    if (at === -1 || slash === -1) return null
    const userPass = url.slice('mysql://'.length, at)
    const colon = userPass.indexOf(':')
    const user = colon === -1 ? userPass : decodeURIComponent(userPass.slice(0, colon))
    const password = colon === -1 ? '' : decodeURIComponent(userPass.slice(colon + 1))
    const hostPort = url.slice(at + 1, slash)
    const db = url.slice(slash + 1).split('?')[0]
    const [host, port] = hostPort.includes(':') ? hostPort.split(':') : [hostPort, '3306']
    return { user, password, host: host || 'localhost', port: port || '3306', database: db }
  } catch {
    return null
  }
}

const url = process.env.DATABASE_URL
const config = parseDatabaseUrl(url)

if (!config) {
  console.error('❌ DATABASE_URL en .env.production no es válida')
  process.exit(1)
}

const now = new Date()
const dateStr = now.toISOString().slice(0, 19).replace(/[-T:]/g, (c) => (c === 'T' ? '-' : c === ':' ? '' : c))
const outFile = path.join(root, `backup-prod-idealista-${dateStr}.sql`)

console.log('📦 Backup PRODUCCIÓN:', config.database, '@', config.host)
console.log('   Salida:', path.basename(outFile))

try {
  if (config.password) process.env.MYSQL_PWD = config.password
  const cmd = [
    'mysqldump',
    '--user=' + config.user,
    '--host=' + config.host,
    '--port=' + config.port,
    '--single-transaction',
    '--set-gtid-purged=OFF',
    '--routines',
    '--triggers',
    '--databases', config.database,
  ].join(' ')
  const out = execSync(cmd, { encoding: 'buffer', maxBuffer: 50 * 1024 * 1024, cwd: root })
  fs.writeFileSync(outFile, out)
  if (config.password) delete process.env.MYSQL_PWD
  const stat = fs.statSync(outFile)
  console.log('✅ Backup guardado:', path.basename(outFile), '(' + Math.round(stat.size / 1024) + ' KB)')
} catch (e) {
  if (config.password) delete process.env.MYSQL_PWD
  console.error('❌ Error:', e.message || e)
  process.exit(1)
}
