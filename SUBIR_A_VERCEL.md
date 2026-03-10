# Subir a Vercel (pasos que tenés que hacer vos)

Yo no puedo entrar a tu cuenta de Vercel ni a PlanetScale. Solo vos podés hacer estos 3 pasos (la primera vez son ~5 minutos).

---

## 1. Login en Vercel (una sola vez)

En la terminal, en la carpeta del proyecto:

```bash
npx vercel login
```

Te abre el navegador para que inicies sesión con GitHub o email. Después de eso ya no hace falta repetirlo.

---

## 2. Base de datos y variable DATABASE_URL

**Crear la DB (si aún no tenés):**

1. Entrá a **https://planetscale.com** → Create a new database (ej: `idealista-db`).
2. En el dashboard → **Connect** → **Prisma** → copiá la Connection string (`mysql://...?sslaccept=strict`).

**Decirle a Vercel la URL:**

- Opción A: En la web → [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables** → Add `DATABASE_URL` y pegá la URL.
- Opción B: En la terminal, después del login:
  ```bash
  npx vercel env add DATABASE_URL
  ```
  Pegá la URL cuando te la pida y elegí Production (y Preview si quieres).

---

## 3. Desplegar

En la carpeta del proyecto:

```bash
npm run deploy
```

(o `npx vercel --prod`).

La primera vez puede preguntarte “Link to existing project?” → si ya importaste el repo desde la web, elegí ese proyecto; si no, “No” y crea uno nuevo.

---

## 4. Crear tablas (solo la primera vez)

Después del primer deploy, en tu máquina poné en `.env` la misma URL de PlanetScale y ejecutá:

```bash
npm run db:push
```

Luego podés sacar esa línea del `.env` para no usarla en local.

---

**Resumen:**  
1) `npx vercel login` (una vez) → 2) PlanetScale: crear DB y copiar URL → 3) Vercel: agregar `DATABASE_URL` → 4) `npm run deploy` → 5) `npm run db:push` con esa URL en `.env` (una vez).
