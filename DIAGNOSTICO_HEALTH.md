# 🔍 Diagnóstico del Endpoint /api/health

Si el endpoint `https://scraper-idealista-production.up.railway.app/api/health` no funciona, sigue estos pasos:

## 1. Verificar que la aplicación esté corriendo

### Endpoint simple (sin base de datos)
Primero, prueba este endpoint que no requiere base de datos:
```
https://scraper-idealista-production.up.railway.app/api/health/simple
```

**Si este endpoint funciona:**
- ✅ La aplicación Next.js está corriendo
- ✅ Las rutas API están funcionando
- ❌ El problema está en la conexión a la base de datos

**Si este endpoint NO funciona:**
- ❌ La aplicación no está corriendo o hay un error en el deployment
- Sigue con el paso 2

## 2. Verificar el deployment en Railway

1. **Ve a Railway Dashboard** → Tu proyecto → Tu servicio de Next.js
2. **Ve a la pestaña "Deployments"**
3. **Verifica el estado del último deployment:**
   - ✅ Verde = Deployment exitoso
   - ❌ Rojo = Deployment fallido
   - 🟡 Amarillo = Deployment en progreso

4. **Si el deployment falló:**
   - Haz clic en el deployment fallido
   - Revisa los logs para ver el error
   - Los errores comunes son:
     - Error en `prisma generate`
     - Error en `npm run build`
     - Variables de entorno faltantes

## 3. Verificar los logs en tiempo real

1. En Railway, ve a tu servicio de Next.js
2. Haz clic en la pestaña **"Deployments"**
3. Haz clic en el deployment más reciente
4. Haz clic en **"View Logs"**
5. Busca mensajes como:
   - `Server listening on port XXXX`
   - `Ready in XXXXms`
   - Errores de conexión a la base de datos

## 4. Verificar variables de entorno

1. En Railway, ve a tu servicio de Next.js
2. Ve a la pestaña **"Variables"**
3. Verifica que exista:
   - `DATABASE_URL` - Debe apuntar a tu base de datos MySQL en Railway
   - `NODE_ENV` - Opcional, pero debería ser `production`

4. **Si falta DATABASE_URL:**
   - Ve a tu servicio de MySQL en Railway
   - Copia la variable `MYSQL_URL` o `DATABASE_URL`
   - Pégala en las variables de entorno de tu servicio Next.js

## 5. Verificar configuración del servicio

1. En Railway, ve a tu servicio de Next.js
2. Ve a la pestaña **"Settings"**
3. Verifica:
   - **Build Command:** `npm install && prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Root Directory:** (debe estar vacío o ser `/`)

## 6. Verificar que el dominio esté configurado

1. En Railway, ve a tu servicio de Next.js
2. Ve a la pestaña **"Settings"** → **"Domains"**
3. Deberías ver un dominio generado automáticamente
4. Si no hay dominio, espera a que el deployment termine

## 7. Probar endpoints manualmente

### Endpoint simple (debe funcionar siempre):
```bash
curl https://scraper-idealista-production.up.railway.app/api/health/simple
```

**Respuesta esperada:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-...",
  "message": "API is running",
  "environment": {
    "nodeEnv": "production",
    "port": "3000",
    "hasDatabaseUrl": true
  }
}
```

### Endpoint completo (requiere base de datos):
```bash
curl https://scraper-idealista-production.up.railway.app/api/health
```

**Si funciona, respuesta esperada:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-...",
  "responseTime": "XXms",
  "environment": {...},
  "database": {
    "connected": true,
    "url": "mysql://...",
    "tables": {
      "listings": X,
      "neighborhoods": Y
    }
  }
}
```

**Si falla, respuesta esperada:**
```json
{
  "success": false,
  "status": "unhealthy",
  "error": "...",
  "database": {
    "connected": false,
    "message": "No se puede conectar a la base de datos..."
  }
}
```

## 8. Soluciones comunes

### Problema: "Cannot GET /api/health"
**Solución:** La aplicación no está corriendo. Verifica el deployment.

### Problema: Timeout o conexión rechazada
**Solución:** 
- Verifica que el servicio esté activo en Railway
- Verifica que el dominio esté correcto
- Espera unos minutos después del deployment

### Problema: Error 500 con mensaje de base de datos
**Solución:**
- Verifica que `DATABASE_URL` esté configurada
- Verifica que la base de datos MySQL esté corriendo
- Verifica que las credenciales sean correctas

### Problema: Error 404
**Solución:**
- Verifica que la ruta sea correcta: `/api/health`
- Verifica que el archivo `app/api/health/route.ts` exista
- Verifica que el build se haya completado correctamente

## 9. Forzar un nuevo deployment

Si nada funciona, intenta forzar un nuevo deployment:

1. En Railway, ve a tu servicio de Next.js
2. Ve a la pestaña **"Settings"**
3. Haz clic en **"Redeploy"** o **"Deploy Latest"**
4. Espera a que termine el deployment (3-5 minutos)
5. Prueba los endpoints nuevamente

## 10. Contactar soporte

Si después de seguir todos estos pasos el problema persiste:

1. Toma capturas de pantalla de:
   - Los logs del deployment
   - Las variables de entorno (sin mostrar contraseñas)
   - La configuración del servicio
2. Verifica que el código esté actualizado en GitHub
3. Revisa si hay errores conocidos en el repositorio

## Endpoints disponibles

- `/api/health/simple` - Health check simple (sin BD)
- `/api/health` - Health check completo (con BD)
- `/api/listings` - Lista de pisos
- `/api/stats` - Estadísticas
- `/api/neighborhoods` - Lista de barrios
- `/api/provinces` - Lista de provincias


