# Usar db4free.net como base de datos (gratis)

Base de datos MySQL gratis para usar con Vercel. No requiere tarjeta.

---

## 1. Crear la base en db4free.net

1. Entrá a **https://www.db4free.net**
2. Clic en **Sign up** (registrarse).
3. Completá:
   - **MySQL username:** el usuario que querés (ej: `idealista_user`)
   - **MySQL password:** una contraseña segura
   - **Database name:** nombre de la base (ej: `idealista_db`)
   - Email y aceptar términos.
4. Confirmá el email si te lo piden.
5. Anotá: **usuario**, **contraseña**, **nombre de la base**.  
   El **host** es: `db4free.net` y el **puerto** es: `3306`.

---

## 2. Armar la DATABASE_URL

Formato para Prisma/Vercel:

```
mysql://USUARIO:CONTRASEÑA@db4free.net:3306/NOMBRE_BASE
```

Reemplazá:
- **USUARIO** = el MySQL username que creaste
- **CONTRASEÑA** = tu contraseña (si tiene caracteres especiales como `@`, `#`, `%`, tenés que codificarlos en URL; abajo hay ejemplos)
- **NOMBRE_BASE** = el nombre de la base que creaste

**Ejemplo:**  
Usuario `idealista_user`, contraseña `miPass123`, base `idealista_db`:

```
mysql://idealista_user:miPass123@db4free.net:3306/idealista_db
```

**Si la contraseña tiene caracteres especiales**, codificálos:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `/` → `%2F`
- `:` → `%3A`

---

## 3. Poner la URL en Vercel

1. [vercel.com](https://vercel.com) → proyecto **scrapper-idealista** → **Settings** → **Environment Variables**.
2. **Add:** Name = `DATABASE_URL`, Value = la URL del paso 2.
3. Marcá Production, Preview y Development → **Save**.

---

## 4. Crear las tablas (una sola vez)

En tu máquina, en la carpeta del proyecto. En tu `.env` poné **solo por un rato** la misma URL:

```
DATABASE_URL="mysql://tu_usuario:tu_contraseña@db4free.net:3306/tu_base"
```

Luego ejecutá:

```bash
npm run db:push
```

Eso crea las tablas `listings` y `neighborhoods` en db4free. Después podés volver a poner en `.env` la URL de tu base local.

---

## 5. Volver a desplegar

Después de agregar `DATABASE_URL` en Vercel:

```bash
npm run deploy
```

O en Vercel: **Deployments** → **Redeploy** del último deploy.

---

## Notas

- db4free puede ser más lento que servicios de pago; para desarrollo y proyectos chicos suele alcanzar.
- Si la app en Vercel no conecta, revisá que la URL esté bien (usuario, contraseña, nombre de base) y que hayas hecho **Redeploy** después de agregar la variable.
