# Configurar DATABASE_URL en Railway

## Problema

Si ves este error:
```
Authentication failed against database server at `mysql.railway.internal`
```

Significa que Railway está usando la **URL interna** que no funciona desde fuera de Railway.

## Solución

### Paso 1: Obtener la URL Externa de MySQL

1. Ve a Railway → Tu servicio **MySQL** (no el Next.js)
2. Ve a la pestaña **"Variables"** o **"Connect"**
3. Busca la variable `MYSQL_URL` o `DATABASE_URL`
4. **IMPORTANTE**: Busca una URL que tenga formato:
   ```
   mysql://root:xxxxx@switchyard.proxy.rlwy.net:xxxx/railway
   ```
   O similar, pero **NO debe tener** `mysql.railway.internal`

### Paso 2: Configurar DATABASE_URL en Next.js

1. Ve a Railway → Tu servicio **Next.js** (la aplicación web)
2. Ve a la pestaña **"Variables"**
3. Busca o crea la variable `DATABASE_URL`
4. Pega la URL **EXTERNA** que copiaste en el Paso 1
5. **Ejemplo de URL externa correcta:**
   ```
   mysql://root:yoRCcsbKMMxcNlpfJKniFXjShSZvWVUW@switchyard.proxy.rlwy.net:15904/railway
   ```
6. Guarda los cambios

### Paso 3: Verificar

1. Espera 1-2 minutos a que Railway reinicie la aplicación
2. Visita: `https://scraper-idealista-production.up.railway.app/api/health`
3. Deberías ver `"status": "healthy"` y `"connected": true`

## Diferencias entre URLs

### ❌ URL Interna (NO funciona desde fuera de Railway)
```
mysql://root:xxxxx@mysql.railway.internal:3306/railway
```
- Solo funciona dentro de la red de Railway
- No funciona para aplicaciones desplegadas

### ✅ URL Externa (CORRECTA)
```
mysql://root:xxxxx@switchyard.proxy.rlwy.net:15904/railway
```
- Funciona desde cualquier lugar
- Es la que debes usar en `DATABASE_URL`

## Verificar la Conexión

Puedes probar la conexión desde tu máquina local:

```bash
mysql -h switchyard.proxy.rlwy.net -P 15904 -u root -p[PASSWORD] railway -e "SELECT 1;"
```

Si funciona, la URL es correcta.

## Troubleshooting

### Error: "Authentication failed"
- Verifica que la contraseña en la URL sea correcta
- Asegúrate de usar la URL externa, no la interna

### Error: "Can't reach database server"
- Verifica que el host sea `switchyard.proxy.rlwy.net` (o similar)
- Verifica que el puerto sea correcto (ej: 15904)

### Error: "Unknown database"
- Verifica que el nombre de la base de datos sea correcto (ej: `railway`)
