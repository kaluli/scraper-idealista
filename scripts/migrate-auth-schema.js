#!/usr/bin/env node
/**
 * Migración única: crea users + user_listing_states y,
 * si listings todavía tiene columnas de contacto (cita_at, …),
 * copia datos a una cuenta legacy y elimina esas columnas.
 *
 * Ejecutar ANTES de `npx prisma db push` cuando la BD ya existía con el esquema antiguo.
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

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const LEGACY_EMAIL = 'legacy@flashprop.local'
const LEGACY_PASSWORD_HASH =
  '$2b$12$Pbd2DRTG76cvRP9K/EMt5.9Ph1NbvBGYbX7GeXCBoDwi3XgDsXLM2'

async function main() {
  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  )`)

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`
  )

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "user_listing_states" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "hidden_at" TIMESTAMP(3),
    "cita_at" TIMESTAMP(3),
    "contacto" VARCHAR(20),
    "telefono" VARCHAR(50),
    "notas" TEXT,
    "llamado" BOOLEAN NOT NULL DEFAULT false,
    "visitado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_listing_states_pkey" PRIMARY KEY ("id")
  )`)

  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_listing_states_user_id_fkey'
  ) THEN
    ALTER TABLE "user_listing_states"
      ADD CONSTRAINT "user_listing_states_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$`)

  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_listing_states_listing_id_fkey'
  ) THEN
    ALTER TABLE "user_listing_states"
      ADD CONSTRAINT "user_listing_states_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$`)

  await prisma.$executeRawUnsafe(`
CREATE UNIQUE INDEX IF NOT EXISTS "user_listing_states_user_id_listing_id_key"
  ON "user_listing_states"("user_id", "listing_id")`)

  await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "user_listing_states_user_id_idx" ON "user_listing_states"("user_id")`)

  await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS "user_listing_states_listing_id_idx" ON "user_listing_states"("listing_id")`)

  const colRows = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'cita_at'
  `)
  const hasLegacyContactCols = Array.isArray(colRows) && colRows.length > 0

  if (hasLegacyContactCols) {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM users WHERE email = '${LEGACY_EMAIL.replace(/'/g, "''")}' LIMIT 1`
    )
    let legacyUserId
    if (Array.isArray(existing) && existing.length > 0) {
      legacyUserId = Number(existing[0].id)
    } else {
      const ins = await prisma.$queryRawUnsafe(`
        INSERT INTO users (email, password_hash, name, updated_at)
        VALUES ('${LEGACY_EMAIL.replace(/'/g, "''")}', '${LEGACY_PASSWORD_HASH.replace(/'/g, "''")}', 'Usuario importado', CURRENT_TIMESTAMP)
        RETURNING id
      `)
      legacyUserId = Number(ins[0].id)
      console.log(`Usuario legacy creado: ${LEGACY_EMAIL} (contraseña inicial: CambiarPass1!)`)
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO user_listing_states (
        user_id, listing_id, hidden_at, cita_at, contacto, telefono, notas, llamado, visitado, updated_at
      )
      SELECT ${legacyUserId}, l.id, NULL, l.cita_at, l.contacto, l.telefono, l.notas, l.llamado, l.visitado, CURRENT_TIMESTAMP
      FROM listings l
      WHERE NOT EXISTS (
        SELECT 1 FROM user_listing_states u WHERE u.user_id = ${legacyUserId} AND u.listing_id = l.id
      )
    `)

    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "cita_at"`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "contacto"`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "telefono"`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "notas"`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "llamado"`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "visitado"`)

    console.log('Datos de contacto migrados a user_listing_states y columnas antiguas eliminadas.')
  } else {
    console.log(
      'No hay columnas de contacto en listings (BD ya migrada o nueva). Tablas users / user_listing_states listas.'
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
