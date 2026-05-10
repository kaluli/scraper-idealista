-- Tablas de auth sin alterar `listings` (evita prisma db push que dropea columnas legacy).
-- Ejecutar: ver scripts/run-create-auth-tables.js

DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_login_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

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
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_listing_states_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "user_listing_states"
    ADD CONSTRAINT "user_listing_states_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_listing_states"
    ADD CONSTRAINT "user_listing_states_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "user_listing_states_user_id_listing_id_key"
  ON "user_listing_states"("user_id", "listing_id");
CREATE INDEX IF NOT EXISTS "user_listing_states_user_id_idx" ON "user_listing_states"("user_id");
CREATE INDEX IF NOT EXISTS "user_listing_states_listing_id_idx" ON "user_listing_states"("listing_id");
