# Pasos para terminar el deploy en Vercel

El repo ya está actualizado en GitHub (`kaluli/scraper-idealista`). Falta:

1. Base de datos MySQL (PlanetScale)
2. Login en Vercel y deploy
3. Variable DATABASE_URL en Vercel
4. Crear tablas en la DB de producción

---

## 1. Crear la base de datos en PlanetScale (gratis)

1. Entrá a **https://planetscale.com** e iniciá sesión (o creá cuenta con GitHub).
2. **Create a new database**:
   - Name: `idealista-db` (o el que quieras)
   - Region: elegí una cercana (ej: `us-east`)
   - Plan: **Hobby** (gratis)
3. Cuando esté creada, entrá al dashboard del database.
4. Clic en **Connect** → **Connect with** → **Prisma**.
5. Copiá la **Connection string** (empieza con `mysql://...` y termina con `?sslaccept=strict`).  
   La vas a usar en el paso 3.

---

## 2. Desplegar desde la web (más fácil que la CLI)

1. Entrá a **https://vercel.com** e iniciá sesión (con GitHub).
2. **Add New** → **Project**.
3. **Import** el repo **kaluli/scraper-idealista** (conectá GitHub si te lo pide).
4. En **Configure Project**:
   - **Environment Variables** → Add:
     - **Name:** `DATABASE_URL`
     - **Value:** pegá la URL de PlanetScale que copiaste en el paso 1.
     - Marcá Production, Preview y Development.
5. **Deploy**.

Cuando termine, Vercel te da una URL tipo `https://scraper-idealista-xxx.vercel.app`.

---

## 3. Crear las tablas en la base de datos (solo una vez)

En la terminal, en la carpeta del proyecto:

```bash
cd /Users/karinapangaro/Documents/scrapper-idealista
```

Poné en tu `.env` (o `.env.local`) **solo por un rato** la misma URL de PlanetScale:

```
DATABASE_URL="mysql://...la URL que copiaste..."
```

Luego ejecutá:

```bash
npm run db:push
```

Eso crea las tablas `listings` y `neighborhoods` en PlanetScale. Después podés sacar o comentar esa línea del `.env` para seguir usando tu base local.

---

## Opción: deploy desde la terminal (si preferís CLI)

Si querés usar Vercel CLI:

```bash
cd /Users/karinapangaro/Documents/scrapper-idealista
npx vercel login
```

Seguí el link que te da para autenticarte en el navegador. Luego:

```bash
npx vercel env add DATABASE_URL
```

Pegá la URL de PlanetScale cuando te la pida (elegí Production). Después:

```bash
npx vercel --prod
```

Y también hacé el paso 3 (crear tablas con `npm run db:push` usando esa misma URL).

---

## Resumen

| Paso | Dónde | Qué hacer |
|------|--------|-----------|
| 1 | PlanetScale | Crear DB y copiar Connection string |
| 2 | Vercel | Import repo, agregar `DATABASE_URL`, Deploy |
| 3 | Tu máquina | Poner `DATABASE_URL` en .env y ejecutar `npm run db:push` |

Cuando tengas la URL de Vercel, la app debería cargar; si ves error de base de datos, es que falta el paso 3.
