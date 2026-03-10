#!/usr/bin/env node
/**
 * Hace un dump MySQL de la base de datos (backup).
 * Usa DATABASE_URL de .env o .env.local.
 *
 * Uso: node scripts/backup-mysql.js
 * Salida: backup-idealista-YYYY-MM-DD-HHmmss.sql en la raíz del proyecto
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
          let val = match[2].trim()
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
          process.env[key] = val
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
    const user = colon === -1 ? userPass : userPass.slice(0, colon)
    const password = colon === -1 ? '' : userPass.slice(colon + 1)
    const hostPort = url.slice(at + 1, slash)
    const db = url.slice(slash + 1).split('?')[0]
    const [host, port] = hostPort.includes(':') ? hostPort.split(':') : [hostPort, '3306']
    return {
      user: decodeURIComponent(user),
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
  console.error('❌ No se encontró DATABASE_URL válida (mysql://...) en .env o .env.local')
  process.exit(1)
}

const root = path.resolve(__dirname, '..')
const now = new Date()
const dateStr = now.toISOString().slice(0, 19).replace(/[-T:]/g, (c) => (c === 'T' ? '-' : c === ':' ? '' : c))
const outFile = path.join(root, `backup-idealista-${dateStr}.sql`)

console.log('📦 Backup MySQL:', config.database, '@', config.host)
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
  ]
  const out = execSync(cmd.join(' '), {
    encoding: 'buffer',
    maxBuffer: 50 * 1024 * 1024,
    cwd: root,
  })
  fs.writeFileSync(outFile, out)
  if (config.password) delete process.env.MYSQL_PWD
  const stat = fs.statSync(outFile)
  console.log('✅ Backup guardado:', path.basename(outFile), '(' + Math.round(stat.size / 1024) + ' KB)')
} catch (e) {
  if (config.password) delete process.env.MYSQL_PWD
  console.error('❌ Error:', e.message || e)
  process.exit(1)
}
