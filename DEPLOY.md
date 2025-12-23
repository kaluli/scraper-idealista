# Guía de Despliegue

Esta guía te ayudará a desplegar la aplicación en un host gratuito.

## Opción 1: Vercel + PlanetScale (Recomendado)

### Paso 1: Crear base de datos en PlanetScale

1. Ve a https://planetscale.com y crea una cuenta gratuita
2. Crea un nuevo proyecto (por ejemplo: "idealista-db")
3. Crea una nueva base de datos
4. En la pestaña "Connect", copia la cadena de conexión (Connection string)
   - Se verá algo como: `mysql://xxxxx:xxxxx@aws.connect.psdb.cloud/xxxxx?sslaccept=strict`
5. Guarda esta URL, la necesitarás en Vercel

### Paso 2: Configurar Prisma para PlanetScale

PlanetScale usa MySQL pero requiere algunas configuraciones especiales. El schema ya está configurado correctamente.

### Paso 3: Desplegar en Vercel

1. Ve a https://vercel.com y crea una cuenta (puedes usar GitHub)
2. Haz clic en "Add New Project"
3. Importa tu repositorio de GitHub: `kaluli/scraper-idealista`
4. Vercel detectará automáticamente que es un proyecto Next.js
5. En "Environment Variables", añade:
   - **Nombre:** `DATABASE_URL`
   - **Valor:** La cadena de conexión de PlanetScale que copiaste antes
6. Haz clic en "Deploy"

### Paso 4: Ejecutar migraciones

Después del despliegue, necesitas crear las tablas en PlanetScale:

1. En Vercel, ve a tu proyecto → Settings → Environment Variables
2. Copia la variable `DATABASE_URL`
3. En tu máquina local, crea un archivo `.env` temporal con esa URL
4. Ejecuta:
   ```bash
   npm run db:push
   ```
5. O usa Prisma Studio para verificar:
   ```bash
   npm run db:studio
   ```

### Paso 5: Importar datos

Una vez que las tablas estén creadas, puedes importar tus datos usando el script de importación con la nueva URL de base de datos.

---

## Opción 2: Railway (Todo en uno)

Railway puede hostear tanto la aplicación como la base de datos MySQL.

### Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app y crea una cuenta (puedes usar GitHub)
2. Haz clic en "New Project"

### Paso 2: Añadir base de datos MySQL

1. En tu proyecto, haz clic en "New" → "Database" → "MySQL"
2. Railway creará automáticamente una base de datos MySQL
3. Ve a la pestaña "Variables" y copia la variable `DATABASE_URL`

### Paso 3: Desplegar la aplicación

1. En Railway, haz clic en "New" → "GitHub Repo"
2. Selecciona tu repositorio `kaluli/scraper-idealista`
3. Railway detectará automáticamente que es un proyecto Next.js
4. En "Variables", añade:
   - **Nombre:** `DATABASE_URL`
   - **Valor:** La URL de la base de datos MySQL que creaste en el paso 2
5. Railway desplegará automáticamente

### Paso 4: Ejecutar migraciones

1. En Railway, ve a tu servicio de la aplicación
2. Abre la terminal (Railway tiene una terminal integrada)
3. Ejecuta:
   ```bash
   npm run db:push
   ```

### Paso 5: Configurar dominio (opcional)

Railway te dará un dominio automático, pero puedes configurar uno personalizado en Settings → Domains.

---

## Opción 3: Render

### Paso 1: Crear base de datos MySQL en Render

1. Ve a https://render.com y crea una cuenta
2. Haz clic en "New" → "PostgreSQL" (o MySQL si está disponible)
3. Crea la base de datos y copia la "Internal Database URL"

### Paso 2: Desplegar aplicación

1. En Render, haz clic en "New" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Añade la variable de entorno `DATABASE_URL`
5. Haz clic en "Create Web Service"

---

## Recomendación

**Para esta aplicación, recomiendo Railway** porque:
- ✅ Todo en un solo lugar (app + base de datos)
- ✅ Tier gratuito generoso
- ✅ Fácil de configurar
- ✅ Soporta MySQL nativamente
- ✅ Terminal integrada para ejecutar comandos

**Vercel + PlanetScale** es mejor si:
- Quieres el mejor rendimiento para Next.js
- Necesitas más control sobre la base de datos
- Planeas escalar mucho

---

## Notas importantes

1. **Variables de entorno:** Nunca subas tu archivo `.env` a GitHub. Usa las variables de entorno del servicio de hosting.

2. **Base de datos:** Después del despliegue, necesitarás ejecutar `npm run db:push` para crear las tablas.

3. **Datos:** Después de crear las tablas, puedes importar tus datos usando el script de importación.

4. **Dominio:** Todos estos servicios te dan un dominio gratuito, pero puedes configurar uno personalizado.

