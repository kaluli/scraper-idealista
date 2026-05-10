#!/usr/bin/env node
/**
 * Todo en uno: actualiza vars de producción desde Vercel y sincroniza LOCAL ← PROD.
 * No requiere .env.production manual si `vercel login` / proyecto enlazado (.vercel/).
 *
 *   npm run db:sync
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function readEnvLine(filePath, key) {
  if (!fs.existsSync(filePath)) return ''
  const content = fs.readFileSync(filePath, 'utf8')
  const prefix = `${key}=`
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    if (!t.startsWith(prefix)) continue
    let val = t.slice(prefix.length).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    return val
  }
  return ''
}

function discoverProductionUrl() {
  try {
    const pjPath = path.join(root, '.vercel', 'project.json')
    if (!fs.existsSync(pjPath)) return ''
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'))
    const projectName = pj.projectName || 'scraper-idealista'
    const r = spawnSync('npx', ['vercel', 'ls', projectName, '--yes'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
      timeout: 25000,
      killSignal: 'SIGKILL',
    })
    if (r.error || r.signal || r.status !== 0 || !r.stdout) return ''
    for (const line of r.stdout.split('\n')) {
      if (!/\bProduction\b/.test(line)) continue
      const m = line.match(/https:\/\/[^\s]+\.vercel\.app/)
      if (m) return m[0].replace(/\/$/, '')
    }
  } catch (_) {
    /* ignore */
  }
  return ''
}

console.log('📡 Vercel → .env.sync.vercel.prod (production)…')
const pull = spawnSync(
  'npx',
  [
    'vercel',
    'env',
    'pull',
    '.env.sync.vercel.prod',
    '--environment',
    'production',
    '--yes',
    '--non-interactive',
  ],
  { cwd: root, stdio: 'inherit', shell: true }
)
if (pull.status !== 0) {
  console.warn(
    '\n⚠️  env pull falló (¿`npx vercel login`?). Se siguen usando archivos .env que ya tengas.\n'
  )
}

console.log('\n📥 Sync LOCAL ← PRODUCCIÓN (lectura directa a la BD de prod)…')
let sync = spawnSync(process.execPath, [path.join(__dirname, 'sync-local-from-prod.js')], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

if (sync.status === 0) process.exit(0)

console.log('\n⚠️  Sync directo falló; intentando HTTPS /api/admin/export …')

const pulledEnv = path.join(root, '.env.sync.vercel.prod')
const baseArg =
  process.argv[2] ||
  process.env.VERCEL_APP_URL ||
  readEnvLine(pulledEnv, 'VERCEL_APP_URL') ||
  discoverProductionUrl() ||
  ''

if (!baseArg) {
  console.error(
    '❌ Pasá la URL de producción: npm run db:sync -- https://tu-app.vercel.app\n' +
      '   (o definí VERCEL_APP_URL en .env.full-sync.local)'
  )
  process.exit(sync.status || 1)
}

sync = spawnSync(
  process.execPath,
  [path.join(__dirname, 'pull-prod-via-vercel.js'), baseArg.replace(/\/$/, '')],
  { cwd: root, stdio: 'inherit', env: process.env }
)
process.exit(sync.status !== 0 ? sync.status : 0)
