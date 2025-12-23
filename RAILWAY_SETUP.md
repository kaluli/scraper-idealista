# Guía de Despliegue en Railway

Guía paso a paso para desplegar tu aplicación en Railway.

## Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app
2. Haz clic en "Start a New Project" o "Login"
3. Inicia sesión con tu cuenta de GitHub (recomendado)
4. Autoriza Railway para acceder a tus repositorios

## Paso 2: Crear un nuevo proyecto

1. En el dashboard de Railway, haz clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio: `kaluli/scraper-idealista`
4. Railway detectará automáticamente que es un proyecto Next.js

## Paso 3: Añadir base de datos MySQL

1. En tu proyecto de Railway, haz clic en **"+ New"** (arriba a la derecha)
2. Selecciona **"Database"** → **"Add MySQL"**
3. Railway creará automáticamente una base de datos MySQL
4. Espera a que se cree (puede tardar 1-2 minutos)

## Paso 4: Obtener la URL de la base de datos

1. Haz clic en el servicio de **MySQL** que acabas de crear
2. Ve a la pestaña **"Variables"**
3. Busca la variable **`MYSQL_URL`** o **`DATABASE_URL`**
4. **Copia esta URL completa** (se verá algo como: `mysql://root:xxxxx@containers-us-west-xxx.railway.app:xxxx/railway`)

## Paso 5: Configurar la variable de entorno en la aplicación

1. En Railway, haz clic en el servicio de tu **aplicación Next.js** (no el MySQL)
2. Ve a la pestaña **"Variables"**
3. Haz clic en **"+ New Variable"**
4. Añade:
   - **Name:** `DATABASE_URL`
   - **Value:** Pega la URL que copiaste en el paso 4
5. Haz clic en **"Add"**

## Paso 6: Esperar el despliegue

1. Railway comenzará a construir y desplegar tu aplicación automáticamente
2. Puedes ver el progreso en la pestaña **"Deployments"**
3. Espera a que el build termine (puede tardar 3-5 minutos)

## Paso 7: Crear las tablas en la base de datos

Una vez que el despliegue esté completo:

1. En Railway, haz clic en tu servicio de la **aplicación**
2. Ve a la pestaña **"Deployments"**
3. Haz clic en el deployment más reciente
4. Haz clic en **"View Logs"** o busca el botón **"Terminal"**
5. En la terminal, ejecuta:
   ```bash
   npm run db:push
   ```
6. Esto creará todas las tablas en tu base de datos MySQL

## Paso 8: Verificar que funciona

1. En Railway, ve a tu servicio de la aplicación
2. En la pestaña **"Settings"**, busca **"Domains"**
3. Railway te habrá dado un dominio automático (algo como: `tu-app.up.railway.app`)
4. Haz clic en el dominio para abrir tu aplicación en el navegador
5. Deberías ver tu aplicación funcionando

## Paso 9: Importar tus datos (opcional)

Si quieres importar tus datos existentes:

1. En Railway, abre la terminal de tu aplicación
2. Crea un archivo temporal con tus datos JSON
3. Ejecuta:
   ```bash
   node scripts/import-json.js tu-archivo.json
   ```

O puedes importar los datos desde tu máquina local usando la URL de la base de datos de Railway.

## Configuración adicional

### Dominio personalizado (opcional)

1. En Railway, ve a tu servicio → **Settings** → **Domains**
2. Haz clic en **"Custom Domain"**
3. Sigue las instrucciones para configurar tu dominio

### Variables de entorno adicionales

Si necesitas añadir más variables de entorno:
1. Ve a **Variables** en tu servicio
2. Haz clic en **"+ New Variable"**
3. Añade las variables que necesites

## Solución de problemas

### Error: "Cannot connect to database"
- Verifica que la variable `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos MySQL esté corriendo (debería estar en verde)

### Error en el build
- Revisa los logs en la pestaña "Deployments"
- Verifica que `package.json` tenga el script `postinstall: prisma generate`

### Las tablas no se crean
- Asegúrate de ejecutar `npm run db:push` en la terminal de Railway
- Verifica que la `DATABASE_URL` sea correcta

## Costos

Railway ofrece:
- **$5 de crédito gratuito** cada mes
- Para una aplicación pequeña-mediana, esto suele ser suficiente
- Puedes ver tu uso en **Settings** → **Usage**

## ¡Listo!

Tu aplicación debería estar funcionando en Railway. Si tienes algún problema, revisa los logs en Railway o consulta la documentación en https://docs.railway.app

