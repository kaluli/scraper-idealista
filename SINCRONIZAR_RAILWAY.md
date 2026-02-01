# Sincronizar Base de Datos Local con Railway

Este documento explica cómo sincronizar tu base de datos local con Railway.

## Pasos para Sincronizar

### Paso 1: Obtener la URL Externa de Railway

1. Ve a **Railway Dashboard** → Tu proyecto → **Servicio MySQL**
2. Ve a la pestaña **"Variables"** o **"Connect"**
3. Busca la variable `MYSQL_URL` o `DATABASE_URL`
4. **Copia la URL externa** (debe tener formato `switchyard.proxy.rlwy.net` o similar)

**Ejemplo de URL externa:**
```
mysql://root:yoRCcsbKMMxcNlpfJKniFXjShSZvWVUW@switchyard.proxy.rlwy.net:15904/railway
```

⚠️ **IMPORTANTE**: No uses la URL interna (`mysql.railway.internal`), solo la externa.

### Paso 2: Ejecutar el Script de Sincronización

```bash
./scripts/sync-to-railway.sh 'mysql://root:PASSWORD@HOST:PORT/railway'
```

**Ejemplo:**
```bash
./scripts/sync-to-railway.sh 'mysql://root:yoRCcsbKMMxcNlpfJKniFXjShSZvWVUW@switchyard.proxy.rlwy.net:15904/railway'
```

### Paso 3: Verificar la Sincronización

El script mostrará:
- ✅ Total de pisos en Railway
- 📊 Total de pisos en local
- ✅ Confirmación si los datos coinciden

## Método Alternativo: Importación Manual

Si prefieres hacerlo manualmente:

### 1. Crear el Dump

```bash
mysqldump -u root idealista_db > dump_railway.sql
```

### 2. Importar a Railway

```bash
mysql -h switchyard.proxy.rlwy.net \
      -P 15904 \
      -u root \
      -p[PASSWORD] \
      railway < dump_railway.sql
```

**Reemplaza:**
- `switchyard.proxy.rlwy.net` con tu host de Railway
- `15904` con tu puerto de Railway
- `[PASSWORD]` con tu contraseña de Railway
- `railway` con el nombre de tu base de datos

## Verificar en Railway

Después de sincronizar, verifica en Railway:

1. Visita: `https://scraper-idealista-production.up.railway.app/api/health`
2. Deberías ver el número correcto de pisos en la respuesta

## Notas

- El script crea automáticamente un dump si no existe uno reciente
- El proceso puede tardar unos minutos dependiendo del tamaño de la base de datos
- Asegúrate de tener la URL externa correcta antes de ejecutar el script


