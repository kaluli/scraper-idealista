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
4. Railway debería detectar automáticamente que es un proyecto Next.js

**⚠️ IMPORTANTE:** Si Railway NO detecta automáticamente Next.js (solo ves iconos de GitHub y MySQL):

1. Después de conectar el repositorio, Railway creará un servicio automáticamente
2. Si no ves el servicio de Next.js, haz clic en **"+ New"** → **"GitHub Repo"** nuevamente
3. Selecciona tu repositorio otra vez
4. Railway debería crear un servicio con el icono de Next.js
5. Si aún no aparece, ve al servicio que se creó (aunque no tenga el icono de Next.js)
6. En la pestaña **"Settings"**, verifica que el **"Build Command"** sea: `npm install && prisma generate && npm run build`
7. Y el **"Start Command"** sea: `npm start`

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

**⚠️ IMPORTANTE:** Si más adelante recibes un error de autenticación, las credenciales pueden haber cambiado. En ese caso:
1. Ve a tu servicio MySQL → Variables
2. Busca `MYSQLPASSWORD` o `MYSQL_ROOT_PASSWORD`
3. Haz clic en los tres puntos (⋯) → **"Regenerate"** para generar una nueva contraseña
4. Copia la nueva `MYSQL_URL` y actualiza `DATABASE_URL` en tu servicio Next.js
5. Ver la guía completa en `SOLUCION_CREDENCIALES_RAILWAY.md`

## Paso 5: Configurar la variable de entorno en la aplicación

**⚠️ CRÍTICO:** Este paso es esencial. Sin `DATABASE_URL`, la aplicación no funcionará.

1. En Railway, haz clic en el servicio de tu **aplicación Next.js** (no el MySQL)
2. Ve a la pestaña **"Variables"**
3. **Verifica si ya existe `DATABASE_URL`:**
   - Si **NO existe**, haz clic en **"+ New Variable"**
   - Si **SÍ existe**, haz clic en ella para editarla
4. Añade o edita:
   - **Name:** `DATABASE_URL`
   - **Value:** Pega la URL que copiaste en el paso 4 (debe empezar con `mysql://`)
5. Haz clic en **"Add"** o **"Save"**

**Verificación rápida:**
- La variable debe aparecer en la lista de variables
- El valor debe empezar con `mysql://`
- No debe haber espacios al inicio o final

**Si recibes el error "Environment variable not found: DATABASE_URL":**
- Consulta `CONFIGURAR_DATABASE_URL.md` para una guía detallada paso a paso

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

### Error: "Authentication failed" o "provided database credentials for `root` are not valid"
Este es un error común cuando las credenciales de MySQL han cambiado en Railway.

**Solución rápida:**
1. Ve a tu servicio MySQL → Variables
2. Busca `MYSQLPASSWORD` o `MYSQL_ROOT_PASSWORD`
3. Haz clic en los tres puntos (⋯) → **"Regenerate"**
4. Copia la nueva `MYSQL_URL` del servicio MySQL
5. Actualiza `DATABASE_URL` en tu servicio Next.js con la nueva URL
6. Reinicia el servicio Next.js (Redeploy)

**Para más detalles, consulta:** `SOLUCION_CREDENCIALES_RAILWAY.md`

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

