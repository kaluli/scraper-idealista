# 📥 Guía para Importar Datos en Railway

Esta guía te ayudará a importar tus archivos JSON a la base de datos MySQL en Railway.

## Paso 1: Crear las tablas en la base de datos

Antes de importar datos, necesitas crear las tablas en la base de datos:

1. **En Railway, haz clic en tu servicio de la aplicación** (Next.js)
2. **Ve a la pestaña "Deployments"**
3. **Haz clic en el deployment más reciente**
4. **Haz clic en "View Logs"** o busca el botón **"Terminal"**
5. **En la terminal, ejecuta:**
   ```bash
   npm run db:push
   ```
6. **Espera a que termine** (debería decir "Database synchronized successfully")

## Paso 2: Preparar los archivos JSON

Tienes varios archivos JSON con datos:
- `pisos_espinardo.json`
- `pisos_juan_carlos.json`
- `pisos_juan_carlos_2.json`
- `pisos_juan_carlos_compra.json`
- `pisos_san_lorenzo.json`
- `pisos_santa_eulalia.json`
- `pisos_santa_eulalia_compra.json`
- `pisos_vistalegre.json`
- `pisos_nuevos.json`
- `pisos.json`

## Paso 3: Importar datos desde tu máquina local

### Opción A: Usar el script de importación (Recomendado)

1. **Obtén la URL de la base de datos de Railway:**
   - En Railway, haz clic en tu servicio **MySQL**
   - Ve a la pestaña **"Variables"**
   - Copia la variable **`MYSQL_URL`** o **`DATABASE_URL`**

2. **En tu máquina local, crea un archivo `.env`** en la raíz del proyecto:
   ```env
   DATABASE_URL="mysql://root:xxxxx@containers-us-west-xxx.railway.app:xxxx/railway"
   ```
   (Reemplaza con la URL real que copiaste)

3. **Instala las dependencias** (si no lo has hecho):
   ```bash
   npm install
   ```

4. **Genera el cliente de Prisma:**
   ```bash
   npm run db:generate
   ```

5. **Importa cada archivo JSON:**
   ```bash
   node scripts/import-json.js pisos_espinardo.json
   node scripts/import-json.js pisos_juan_carlos.json
   node scripts/import-json.js pisos_juan_carlos_2.json
   node scripts/import-json.js pisos_juan_carlos_compra.json
   node scripts/import-json.js pisos_san_lorenzo.json
   node scripts/import-json.js pisos_santa_eulalia.json
   node scripts/import-json.js pisos_santa_eulalia_compra.json
   node scripts/import-json.js pisos_vistalegre.json
   node scripts/import-json.js pisos_nuevos.json
   node scripts/import-json.js pisos.json
   ```

### Opción B: Importar todos los archivos a la vez

Puedes crear un script simple para importar todos:

```bash
# En tu terminal, ejecuta:
for file in pisos_*.json; do
  echo "Importando $file..."
  node scripts/import-json.js "$file"
done
```

## Paso 4: Verificar que los datos se importaron

1. **Abre tu aplicación en Railway** (la URL que obtuviste antes)
2. **Deberías ver los pisos** en la lista
3. **Las estadísticas** deberían aparecer automáticamente

## Paso 5: Usar Prisma Studio (Opcional - para ver los datos)

Si quieres ver los datos directamente en la base de datos:

1. **En tu máquina local**, con el `.env` configurado:
   ```bash
   npm run db:studio
   ```
2. **Se abrirá Prisma Studio** en tu navegador
3. **Podrás ver y editar** todos los datos

## ⚠️ Notas importantes

- **El script evita duplicados**: Si un piso ya existe (mismo link), se omite
- **Los datos se normalizan automáticamente**: El script convierte diferentes formatos de JSON al formato de la BD
- **Puedes importar múltiples veces**: No hay problema en ejecutar el script varias veces

## 🔄 Si necesitas reimportar todo

Si quieres eliminar todos los datos e importar de nuevo:

1. **En Railway, abre la terminal de tu aplicación**
2. **Conecta a la base de datos MySQL** (puedes usar Prisma Studio o la terminal)
3. **Elimina los datos:**
   ```sql
   DELETE FROM listings;
   ```
4. **Luego importa de nuevo** usando el script

## 📊 Verificar estadísticas

Después de importar, verifica que:
- Los filtros funcionan correctamente
- Las estadísticas se muestran
- Los barrios aparecen en el selector
- Los precios y superficies se muestran correctamente

## 🎯 Resumen rápido

```bash
# 1. Configurar .env con DATABASE_URL de Railway
# 2. Generar cliente Prisma
npm run db:generate

# 3. Crear tablas (si no lo has hecho)
npm run db:push

# 4. Importar datos
node scripts/import-json.js pisos_espinardo.json
# ... repite para cada archivo
```

¡Listo! 🚀


