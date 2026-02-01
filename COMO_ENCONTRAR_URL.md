# 📍 Cómo encontrar la URL de tu aplicación en Railway

Railway crea automáticamente una URL para tu aplicación. Aquí te explico cómo encontrarla:

## Método 1: Desde Settings → Domains (Más fácil)

1. **En Railway, haz clic en tu servicio de la aplicación** (el que tiene tu código Next.js)
2. **Ve a la pestaña "Settings"** (Configuración)
3. **Busca la sección "Domains"** (Dominios)
4. **Verás algo como esto:**
   ```
   Generated Domain
   https://tu-app-production.up.railway.app
   ```
5. **Haz clic en ese enlace** o cópialo para abrir tu aplicación

## Método 2: Desde el Dashboard del Proyecto

1. **En el dashboard principal de Railway**, verás todos tus servicios
2. **Debajo del nombre de tu servicio**, a veces aparece un pequeño enlace
3. **Haz clic en ese enlace** para abrir la aplicación

## Método 3: Desde Deployments

1. **Ve a la pestaña "Deployments"** de tu servicio
2. **Haz clic en el deployment más reciente** (el que está en verde/completado)
3. **En la parte superior**, a veces aparece un botón **"View"** o un enlace al dominio

## Método 4: Verificar en los Logs

1. **Ve a la pestaña "Deployments"**
2. **Haz clic en el deployment más reciente**
3. **Haz clic en "View Logs"**
4. **Busca en los logs** algo como:
   ```
   Server listening on port 3000
   Application available at: https://tu-app-production.up.railway.app
   ```

## Formato típico de la URL

Las URLs de Railway suelen tener este formato:
- `https://[nombre-proyecto]-[hash].up.railway.app`
- `https://[nombre-servicio].up.railway.app`

Ejemplos:
- `https://scraper-idealista-production-abc123.up.railway.app`
- `https://web-production-xyz789.up.railway.app`

## ⚠️ Si no ves ningún dominio

Si no aparece ningún dominio en "Settings" → "Domains":

1. **Espera a que el deployment termine** (puede tardar 3-5 minutos)
2. **Verifica que el deployment esté completo** (debe estar en verde)
3. **Si el deployment falló**, revisa los logs para ver el error
4. **Una vez que el deployment esté completo**, Railway creará automáticamente el dominio

## 🔄 Generar un nuevo dominio

Si necesitas generar un nuevo dominio:

1. Ve a **Settings** → **Domains**
2. Haz clic en **"Generate Domain"** o **"Add Domain"**
3. Railway creará un nuevo dominio automáticamente

## 📝 Nota importante

- **El dominio se crea automáticamente** cuando el deployment se completa exitosamente
- **Puede tardar unos minutos** después de que el deployment termine
- **El dominio es público** - cualquiera con la URL puede acceder a tu aplicación
- **Puedes cambiar el dominio** en Settings → Domains si lo deseas

## 🎯 Resumen rápido

**La forma más rápida:**
1. Haz clic en tu servicio
2. Ve a **Settings**
3. Busca **"Domains"**
4. Copia la URL que aparece ahí

¡Esa es tu URL! 🚀


