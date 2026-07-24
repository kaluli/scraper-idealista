#!/usr/bin/env node
/**
 * Actualiza la contraseña de un usuario por email (uso local / servidor).
 * Ejemplo: node scripts/update-password.js vergaravjulieta@gmail.com "Juli1234"
 */
const path = require('path')
const fs = require('fs')

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
        if (!process.env[key]) process.env[key] = val
      }
    })
  }
}

const email = (process.argv[2] || '').trim().toLowerCase()
const newPassword = process.argv[3] || ''
if (!email) {
  console.error('Uso: node scripts/update-password.js <email> <nueva-contraseña>')
  process.exit(1)
}

if (newPassword.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres')
  process.exit(1)
}

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async () => {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const u = await prisma.user.updateMany({
      where: { email },
      data: { passwordHash },
    })
    if (u.count === 0) {
      console.error('No existe un usuario con ese email.')
      process.exit(1)
    }
    console.log('OK: contraseña actualizada para', email)
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
