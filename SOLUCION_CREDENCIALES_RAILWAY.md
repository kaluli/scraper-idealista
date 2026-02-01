# 🔐 Solución: Error de Autenticación en Railway MySQL

Si recibes el error:
```
Authentication failed against database server at `mysql.railway.internal`, 
the provided database credentials for `root` are not valid.
```

Sigue estos pasos para solucionarlo:

## Opción 1: Regenerar las credenciales de MySQL (Recomendado)

### Paso 1: Regenerar la contraseña de MySQL

1. **Ve a Railway Dashboard** → Tu proyecto → **Servicio MySQL**
2. **Ve a la pestaña "Variables"**
3. **Busca la variable `MYSQLPASSWORD`** o `MYSQL_ROOT_PASSWORD`
4. **Haz clic en los tres puntos (⋯)** al lado de la variable
5. **Selecciona "Regenerate"** o **"Reset"**
6. Railway generará una nueva contraseña automáticamente

### Paso 2: Obtener la nueva URL de conexión

1. **En el mismo servicio MySQL**, ve a la pestaña **"Variables"**
2. **Busca la variable `MYSQL_URL`** o `DATABASE_URL`
3. **Copia la URL completa** (se verá algo como):
   ```
   mysql://root:NUEVA_CONTRASEÑA@containers-us-west-xxx.railway.app:xxxx/railway
   ```

### Paso 3: Actualizar DATABASE_URL en tu servicio Next.js

1. **Ve a tu servicio Next.js** (no el MySQL)
2. **Ve a la pestaña "Variables"**
3. **Busca la variable `DATABASE_URL`**
4. **Haz clic en ella para editarla**
5. **Pega la nueva URL** que copiaste del servicio MySQL
6. **Guarda los cambios**

### Paso 4: Reiniciar el servicio Next.js

1. **Ve a la pestaña "Deployments"** de tu servicio Next.js
2. **Haz clic en "Redeploy"** o espera a que Railway detecte el cambio automáticamente
3. **Espera a que termine el deployment** (2-3 minutos)

### Paso 5: Verificar que funciona

Prueba el endpoint de health:
```
https://scraper-idealista-production.up.railway.app/api/health
```

Deberías ver:
```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "connected": true
  }
}
```

---

## Opción 2: Usar la variable compartida de Railway

Railway puede compartir automáticamente las variables entre servicios conectados.

### Paso 1: Verificar la conexión entre servicios

1. **Ve a tu servicio Next.js**
2. **Ve a la pestaña "Settings"**
3. **Busca la sección "Connected Services"** o **"Service Connections"**
4. **Verifica que tu servicio MySQL esté conectado**

### Paso 2: Usar la referencia de Railway

En lugar de copiar la URL completa, Railway puede usar una referencia:

1. **En tu servicio Next.js** → **Variables**
2. **Si no existe `DATABASE_URL`, crea una nueva variable:**
   - **Nombre:** `DATABASE_URL`
   - **Valor:** Haz clic en **"Reference"** o **"Use from MySQL service"**
   - Selecciona la variable `MYSQL_URL` o `DATABASE_URL` del servicio MySQL
3. **Esto creará una referencia automática** que se actualizará si cambian las credenciales

---

## Opción 3: Copiar manualmente la URL correcta

### Paso 1: Obtener todas las variables de MySQL

1. **Ve a tu servicio MySQL** → **Variables**
2. **Anota estos valores:**
   - `MYSQLHOST` o `MYSQL_HOST` (ej: `containers-us-west-xxx.railway.app`)
   - `MYSQLPORT` o `MYSQL_PORT` (ej: `12345`)
   - `MYSQLDATABASE` o `MYSQL_DATABASE` (ej: `railway`)
   - `MYSQLUSER` o `MYSQL_USER` (ej: `root`)
   - `MYSQLPASSWORD` o `MYSQL_ROOT_PASSWORD` (la contraseña)

### Paso 2: Construir la URL manualmente

La URL debe tener este formato:
```
mysql://USUARIO:CONTRASEÑA@HOST:PUERTO/BASE_DE_DATOS
```

Ejemplo:
```
mysql://root:KFztQtzkoZEBfoQgGxcpDjsQRRBOCEvV@containers-us-west-xxx.railway.app:12345/railway
```

**⚠️ IMPORTANTE:** Si la contraseña contiene caracteres especiales, debes codificarlos en URL:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

### Paso 3: Actualizar DATABASE_URL

1. **Ve a tu servicio Next.js** → **Variables**
2. **Edita `DATABASE_URL`**
3. **Pega la URL que construiste**
4. **Guarda**

---

## Opción 4: Usar el formato interno de Railway

Railway también puede usar el formato interno `mysql.railway.internal`:

### Paso 1: Obtener las credenciales

1. **Ve a tu servicio MySQL** → **Variables**
2. **Copia:**
   - `MYSQLUSER` o `MYSQL_USER`
   - `MYSQLPASSWORD` o `MYSQL_ROOT_PASSWORD`
   - `MYSQLDATABASE` o `MYSQL_DATABASE`

### Paso 2: Construir la URL interna

```
mysql://USUARIO:CONTRASEÑA@mysql.railway.internal:3306/BASE_DE_DATOS
```

Ejemplo:
```
mysql://root:KFztQtzkoZEBfoQgGxcpDjsQRRBOCEvV@mysql.railway.internal:3306/railway
```

**Nota:** El puerto interno suele ser `3306` (puerto estándar de MySQL).

---

## Verificar que la URL es correcta

Puedes verificar el formato de tu URL con este script de Node.js:

```javascript
// test-db-url.js
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

console.log('✅ DATABASE_URL encontrada');
console.log('Formato:', url.startsWith('mysql://') ? '✅ Correcto' : '❌ Incorrecto');

// Extraer componentes
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (match) {
  const [, user, password, host, port, database] = match;
  console.log('Usuario:', user);
  console.log('Host:', host);
  console.log('Puerto:', port);
  console.log('Base de datos:', database);
  console.log('Contraseña:', password.length > 0 ? '✅ Presente' : '❌ Faltante');
} else {
  console.error('❌ Formato de URL incorrecto');
}
```

Ejecuta:
```bash
DATABASE_URL="tu_url_aqui" node test-db-url.js
```

---

## Solución rápida: Script de Railway

Railway tiene un script para obtener la URL correcta:

1. **Ve a tu servicio MySQL** → **Variables**
2. **Busca la variable `MYSQL_URL`** (Railway la crea automáticamente)
3. **Cópiala directamente**
4. **Pégala en `DATABASE_URL` de tu servicio Next.js**

---

## Si nada funciona: Crear nueva base de datos

Si después de intentar todo lo anterior sigue sin funcionar:

1. **Crea un nuevo servicio MySQL** en Railway
2. **Espera a que se cree completamente**
3. **Copia la nueva `MYSQL_URL`**
4. **Actualiza `DATABASE_URL` en tu servicio Next.js**
5. **Ejecuta las migraciones:**
   ```bash
   # En tu máquina local, con la nueva DATABASE_URL
   DATABASE_URL="nueva_url" npx prisma db push
   ```

---

## Checklist final

- [ ] La variable `DATABASE_URL` existe en tu servicio Next.js
- [ ] La URL tiene el formato correcto: `mysql://usuario:contraseña@host:puerto/base_de_datos`
- [ ] Las credenciales están actualizadas (regeneradas recientemente)
- [ ] El servicio MySQL está corriendo y activo
- [ ] El servicio Next.js se ha reiniciado después de actualizar la variable
- [ ] El endpoint `/api/health` ahora funciona correctamente

---

## Contactar soporte

Si después de seguir todos estos pasos el problema persiste:

1. Verifica los logs del servicio MySQL en Railway
2. Verifica los logs del servicio Next.js
3. Toma capturas de pantalla de:
   - Las variables de entorno (sin mostrar contraseñas completas)
   - Los logs de error
   - La configuración de los servicios


