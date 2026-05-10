#!/usr/bin/env node
/**
 * Arranca `next dev` con el mismo .env que check-env-dev y, si falta,
 * NEXTAUTH_SECRET / NEXTAUTH_URL por defecto solo en desarrollo local.
 * Así el middleware de NextAuth no devuelve error 500 en /contactos sin .env.local completo.
 */
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

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

if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET =
    'flashprop-local-dev-only-do-not-use-in-production-min-32-characters-long'
  console.warn('')
  console.warn(
    'ℹ️  NEXTAUTH_SECRET no estaba definido: usando valor solo para desarrollo local.'
  )
  console.warn('   En producción definí NEXTAUTH_SECRET en Vercel / tu hosting.')
  console.warn('')
}

if (!process.env.NEXTAUTH_URL?.trim()) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
}

const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => process.exit(code ?? 0))
