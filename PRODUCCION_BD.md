# Error en producción: "Can't reach database server at sql.freedb.tech:3306"

Este error en Vercel significa que la aplicación **no puede establecer conexión TCP** con el servidor MySQL de FreeDB. No es un fallo de usuario/contraseña.

## Causas habituales

1. **FreeDB bloquea las IP de Vercel**  
   Los planes gratuitos de muchos hosts MySQL solo permiten conexiones desde ciertas IP. Las funciones serverless de Vercel usan IP que pueden no estar permitidas en FreeDB.

2. **Base de datos pausada o inactiva**  
   En FreeDB, si la base lleva tiempo sin uso, a veces se pausa. Entrá al [panel de FreeDB](https://freedb.tech) y comprobá que la base esté activa.

3. **Timeout de red**  
   La primera conexión desde una función serverless puede tardar; si el servidor tarda en responder, puede fallar por tiempo.

## Qué hacer (en orden)

### 1. Revisar FreeDB

- Entrá a **https://freedb.tech** e iniciá sesión.
- Comprobá que la base **freedb_scraper** (o la que uses) esté **Active**, no pausada.
- Buscá opciones tipo **“Remote MySQL”**, **“Allow external connections”** o **“Access from anywhere”** y activalas si existen.
- En la FAQ o ayuda de FreeDB, revisá si indican restricciones por IP o que no soportan conexiones desde “cloud / serverless”.

### 2. Probar más tiempo de conexión en Vercel

En **Vercel → proyecto → Settings → Environment Variables**, editá `DATABASE_URL` y añadí un timeout mayor al final de la URL (sin borrar lo que ya tenés):

```text
mysql://usuario:password@sql.freedb.tech:3306/freedb_scraper?connect_timeout=15
```

Guardá, hacé **Redeploy** del proyecto y probá de nuevo.

### 3. Si sigue sin conectar: usar un MySQL que soporte Vercel

Si FreeDB no permite conexiones desde Vercel (o no hay forma de activarlo), hay que usar un MySQL/compatible que sí permita conexiones desde internet y serverless, por ejemplo:

- **[PlanetScale](https://planetscale.com)** – MySQL compatible, tier gratuito, suele ir bien con Vercel.
- **[Railway](https://railway.app)** – MySQL como servicio, tier gratuito.
- **[Neon](https://neon.tech)** – Postgres (habría que migrar; Prisma también soporta Postgres).

En todos los casos:

1. Creás la base en el nuevo proveedor.
2. Copiás la **connection string** que te dan (formato `mysql://...` o `postgres://...`).
3. En **Vercel → Environment Variables** reemplazás `DATABASE_URL` por esa nueva URL.
4. Ejecutás las migraciones o el schema contra la nueva base (por ejemplo con `node scripts/db-push-prod.js` después de apuntar ese script a la nueva URL, o con `npx prisma db push` usando esa misma URL).

---

**Resumen:** Lo más probable es que FreeDB no acepte conexiones desde las IP de Vercel. Si en el panel de FreeDB no podés activar “remote/external access” o no hay documentación al respecto, la opción estable es cambiar a un proveedor que soporte conexiones desde Vercel (PlanetScale, Railway, etc.) y poner esa nueva URL en `DATABASE_URL` en producción.
