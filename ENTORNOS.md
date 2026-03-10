# Separación de entornos: desarrollo y producción

La app usa **archivos distintos** para desarrollo y producción. No mezcles uno con el otro.

## Desarrollo local (tu máquina)

- **Archivo:** `.env.development.local` (no se sube a git).
- **Cuándo se usa:** solo cuando ejecutás `npm run dev`.
- **Contenido:** únicamente la URL de tu **MySQL local** (localhost).

**Primera vez:**

```bash
cp .env.development.local.example .env.development.local
# Editá .env.development.local y poné tu usuario/contraseña/base si hace falta
```

Ejemplo en `.env.development.local`:

```
DATABASE_URL="mysql://root@localhost:3306/idealista_db"
```

- **No pongas** la URL de FreeDB ni de producción en este archivo.
- Antes de arrancar, el script `check-env-dev.js` comprueba que `DATABASE_URL` sea local (localhost). Si apunta a FreeDB, `npm run dev` falla y te pide corregirlo.

## Producción (Vercel)

- **No uses archivos** en el repo para la base de producción.
- **Dónde se configura:** Vercel → tu proyecto → Settings → Environment Variables.
- Ahí definís `DATABASE_URL` con la URL de FreeDB (o la base que uses en producción).
- En el deploy, Vercel inyecta esa variable; la app no lee `.env.development.local` ni ningún `.env` local.

## Resumen

| Entorno      | Dónde se configura              | Archivo que usa la app        |
|-------------|----------------------------------|-------------------------------|
| Desarrollo  | Tu máquina                       | `.env.development.local`      |
| Producción  | Vercel → Environment Variables   | Variables de Vercel (no archivo) |

- **Local:** solo MySQL en localhost, archivo `.env.development.local`.
- **Producción:** solo variables en Vercel, sin depender de archivos del repo.
- **Deploy:** se hace desde Vercel (o `vercel --prod`); en ese caso no se usan archivos de desarrollo.

---

## Si producción (Vercel) sigue sin mostrar datos

1. **Variable en Vercel:** Entrá a Vercel → tu proyecto → **Settings** → **Environment Variables**. Tiene que existir **`DATABASE_URL`** para el entorno **Production** (y Preview si usás).
2. **Base correcta en FreeDB:** La URL tiene que terminar en **`/freedb_scraper`** (no `/scraper`). Ejemplo:  
   `mysql://freedb_kaluli:TU_PASSWORD@sql.freedb.tech:3306/freedb_scraper`
3. **Redeploy:** Después de tocar variables, hacé **Redeploy** del último deployment (Deployments → ⋮ → Redeploy).
4. **Comprobar:** Abrí `https://TU-APP.vercel.app/api/health` y revisá que `database.databaseName` sea `freedb_scraper` y que `listings` y `neighborhoods` tengan números > 0.
