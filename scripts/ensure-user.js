#!/usr/bin/env node
/**
 * Crea o actualiza un usuario (hash bcrypt, igual que /api/auth/register).
 *
 * NO pongas la contraseña en el código: usá variable de entorno.
 *
 * Producción (con vars descargadas desde Vercel):
 *   npx vercel env pull .env.sync.vercel.prod --environment production --yes
 *   ENSURE_USER_PASSWORD='tu-contraseña' node scripts/ensure-user.js kaluli@gmail.com --admin
 *
 * O con DATABASE_URL explícita:
 *   DATABASE_URL='postgresql://…' ENSURE_USER_PASSWORD='…' node scripts/ensure-user.js email@dominio.com
 *
 * Opciones:
 *   --admin   rol admin (si no, usuario normal)
 */

const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')

const root = path.resolve(__dirname, '..')

function loadEnvFiles() {
  const names = [
    '.env.sync.vercel.prod',
    '.env.production',
    '.env.local',
    '.env.development.local',
    '.env',
  ]
  for (const name of names) {
    const p = path.join(root, name)
    if (!fs.existsSync(p)) continue
    const content = fs.readFileSync(p, 'utf8')
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (!match) return
      const key = match[1].trim()
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    })
  }
}

loadEnvFiles()

const args = process.argv.slice(2).filter((a) => a !== '--admin')
const wantAdmin = process.argv.includes('--admin')
const email = (args[0] || '').trim().toLowerCase()
const passwordFromArgv = args[1]

const password =
  process.env.ENSURE_USER_PASSWORD?.trim() || passwordFromArgv || ''

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: ENSURE_USER_PASSWORD=… node scripts/ensure-user.js <email> [--admin]')
  console.error('   (opcional segundo arg: contraseña — menos seguro que la env)')
  process.exit(1)
}

if (!password || password.length < 8) {
  console.error('❌ Definí ENSURE_USER_PASSWORD (mín. 8 caracteres) o pasá la contraseña como segundo argumento.')
  process.exit(1)
}

const dbUrl = (process.env.DATABASE_URL || '').trim()
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('❌ Falta DATABASE_URL (postgres). Ej.: vercel env pull .env.sync.vercel.prod')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
})

;(async () => {
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          ...(wantAdmin ? { role: 'admin' } : {}),
        },
      })
      console.log('✅ Usuario actualizado:', email, wantAdmin ? '(admin)' : '')
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: wantAdmin ? 'admin' : 'user',
          name: null,
        },
      })
      console.log('✅ Usuario creado:', email, wantAdmin ? '(admin)' : '')
    }
  } catch (e) {
    console.error('❌', e.message || e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
