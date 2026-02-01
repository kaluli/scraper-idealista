# Desplegar en Vercel

Guía para hostear el proyecto **scraper-idealista** en Vercel.

## Requisito: base de datos MySQL externa

Vercel **no incluye base de datos**. Necesitás una MySQL en la nube y configurar `DATABASE_URL` en Vercel.

Opciones gratuitas:
- **PlanetScale** (recomendado): [planetscale.com](https://planetscale.com) — MySQL gratis, compatible con Prisma.
- **Railway**: [railway.app](https://railway.app) — podés crear solo el servicio MySQL y usar la URL en Vercel.

---

## Paso 1: Subir el código a GitHub

Si aún no tenés el repo en GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/scrapper-idealista.git
git push -u origin main
```

Reemplazá `TU_USUARIO` por tu usuario de GitHub.

---

## Paso 2: Crear la base de datos (PlanetScale)

1. Entrá a [planetscale.com](https://planetscale.com) y creá una cuenta (o iniciá sesión).
2. **Create a new database** → nombre ej: `idealista-db` → región cercana (ej: `us-east`).
3. En el dashboard del database → **Connect** → **Connect with Prisma**.
4. Copiá la **Connection string** (algo como):
   ```
   mysql://usuario:contraseña@aws.connect.psdb.cloud/idealista-db?sslaccept=strict
   ```
5. En PlanetScale: **Branches** → tu branch → **Create deploy request** → **Deploy** para aplicar el schema (o usá `prisma db push` desde tu máquina con esa URL).

Para crear las tablas desde tu máquina una sola vez:

```bash
# En .env poné temporalmente la URL de PlanetScale
DATABASE_URL="mysql://..." npm run db:push
```

---

## Paso 3: Desplegar en Vercel

### Opción A: Desde la web (recomendado)

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión (con GitHub si querés).
2. **Add New** → **Project**.
3. **Import** el repo `scrapper-idealista` desde GitHub (conectá GitHub si te lo pide).
4. Vercel detecta Next.js; no cambies el **Framework Preset**.
5. En **Environment Variables** agregá:
   - **Name:** `DATABASE_URL`
   - **Value:** la URL de PlanetScale (o Railway MySQL) que copiaste.
   - Marcá **Production**, **Preview** y **Development** si querés usarla en todos.
6. **Deploy**.

### Opción B: Desde la terminal (Vercel CLI)

1. Instalá Vercel CLI e iniciá sesión:

```bash
npm i -g vercel
vercel login
```

2. En la raíz del proyecto:

```bash
cd /Users/karinapangaro/Documents/scrapper-idealista
vercel
```

3. Seguí las preguntas (link a proyecto existente o crear uno nuevo).
4. Agregá la variable de entorno:

```bash
vercel env add DATABASE_URL
```

Pegá la `DATABASE_URL` cuando te la pida y elegí Production (y Preview si quieres).
5. Volvé a desplegar para que tome la variable:

```bash
vercel --prod
```

---

## Paso 4: Crear tablas en producción (solo la primera vez)

Si no corriste `db:push` con la URL de producción antes:

1. En tu máquina, en `.env` (o `.env.local`) poné **solo por un momento** la misma `DATABASE_URL` que usás en Vercel (PlanetScale/Railway).
2. Ejecutá:

```bash
npm run db:push
```

3. Borrá o comentá esa URL de producción de tu `.env` para no usarla por error en local.

Alternativa: en PlanetScale podés crear las tablas a mano desde la consola SQL usando el schema de Prisma (`prisma/schema.prisma`).

---

## Resumen de variables en Vercel

| Variable        | Descripción                          | Ejemplo                          |
|----------------|--------------------------------------|----------------------------------|
| `DATABASE_URL` | URL de MySQL (PlanetScale o Railway) | `mysql://user:pass@host/db?ssl...` |

---

## Después del deploy

- La URL de la app será algo como: `https://scrapper-idealista-xxx.vercel.app`.
- Cada push a `main` (o la rama que elijas) puede configurarse para que Vercel redespliegue automáticamente.
- Para ver logs y variables: **Vercel Dashboard** → tu proyecto → **Settings** / **Deployments**.

Si algo falla en el build, revisá que:
1. `DATABASE_URL` esté bien definida en Vercel.
2. El build sea `prisma generate && next build` (ya está así en tu `package.json`).
3. En PlanetScale, el branch que usás esté “deployed” y la URL sea de ese branch.
