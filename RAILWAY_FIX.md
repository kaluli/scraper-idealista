# Solución: No aparece el icono de Next.js en Railway

Si solo ves los iconos de GitHub y MySQL en Railway pero no el de Next.js, sigue estos pasos:

## Opción 1: Verificar el servicio existente

1. En Railway, busca el servicio que se creó al conectar tu repositorio
2. Haz clic en ese servicio (aunque no tenga el icono de Next.js)
3. Ve a la pestaña **"Settings"**
4. Verifica que:
   - **Build Command:** `npm install && prisma generate && npm run build`
   - **Start Command:** `npm start`
5. Si están correctos, el servicio debería funcionar aunque no tenga el icono

## Opción 2: Crear un nuevo servicio manualmente

1. En tu proyecto de Railway, haz clic en **"+ New"** (arriba a la derecha)
2. Selecciona **"Empty Service"** o **"GitHub Repo"**
3. Si seleccionas "GitHub Repo", elige tu repositorio
4. En la pestaña **"Settings"** del nuevo servicio:
   - **Build Command:** `npm install && prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Root Directory:** (déjalo vacío o pon `/`)

## Opción 3: Forzar la detección de Next.js

1. Elimina el servicio actual (si no tiene el icono de Next.js)
2. En Railway, haz clic en **"+ New"** → **"GitHub Repo"**
3. Selecciona tu repositorio
4. Railway debería detectar automáticamente que es Next.js por:
   - El archivo `package.json` con `next` como dependencia
   - El archivo `next.config.js`
   - El script `build` en `package.json`

## Verificar que funciona

1. Ve a la pestaña **"Deployments"** de tu servicio
2. Deberías ver un deployment en progreso o completado
3. Si hay errores, haz clic en el deployment y revisa los logs
4. Una vez que el deployment esté completo, ve a **"Settings"** → **"Domains"**
5. Haz clic en el dominio para abrir tu aplicación

## Configuración correcta

Tu servicio debería tener estas configuraciones:

- **Build Command:** `npm install && prisma generate && npm run build`
- **Start Command:** `npm start`
- **Variables de entorno:**
  - `DATABASE_URL` = (URL de tu base de datos MySQL)

## Nota sobre los iconos

El icono de Next.js es solo visual. Lo importante es que:
- El servicio tenga los comandos correctos
- El deployment se complete sin errores
- La aplicación funcione cuando accedas al dominio

Si todo funciona correctamente, no importa si el icono no aparece. Railway a veces no detecta automáticamente el framework, pero la aplicación funcionará igual.


