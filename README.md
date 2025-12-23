# Gestor de Pisos Idealista

Aplicación web para gestionar pisos de alquiler y compra con filtros por tipo, barrios y provincias.

## Características

- ✅ Añadir pisos con información completa
- ✅ Eliminar pisos
- ✅ Filtros por tipo (Alquiler/Compra)
- ✅ Filtros por barrios
- ✅ Filtros por provincia
- ✅ Filtros por precio máximo
- ✅ Estadísticas por barrio (precio promedio, superficie, habitaciones)
- ✅ Cálculo de rentabilidad comparando alquiler vs compra
- ✅ Base de datos MySQL con Prisma
- ✅ Interfaz moderna y responsive

## Datos actuales

**Nota:** Actualmente la aplicación contiene datos principalmente de la provincia de **Murcia**, pero está diseñada para escalar fácilmente con cualquier provincia y barrio. La estructura de la base de datos y los filtros están preparados para manejar múltiples provincias y sus respectivos barrios.

## Campos de cada piso

- **Título del piso**
- **Precio** (€)
- **Metros cuadrados** (m²)
- **Link a Idealista**
- **Tasa de rentabilidad** (%)
- **Tipo** (Alquiler/Compra)
- **Barrio**
- **Ciudad**
- **Provincia**
- **Habitaciones**

## Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar base de datos MySQL:**

Crea un archivo `.env` en la raíz del proyecto:
```env
DATABASE_URL="mysql://usuario:password@localhost:3306/idealista_db"
```

Ejemplo:
```env
DATABASE_URL="mysql://root:password@localhost:3306/idealista_db"
```

3. **Crear la base de datos:**
```bash
# Generar el cliente Prisma
npm run db:generate

# Crear las tablas en MySQL
npm run db:push
```

4. **Ejecutar la aplicación:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Scripts disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Sincronizar esquema con la base de datos
- `npm run db:studio` - Abrir Prisma Studio (interfaz visual de BD)

## Estructura de la base de datos

La tabla `Listing` contiene:
- `id` - ID único
- `title` - Título del piso
- `price` - Precio
- `surface` - Metros cuadrados (opcional)
- `link` - URL de Idealista
- `profitabilityRate` - Tasa de rentabilidad (opcional)
- `type` - Tipo: "alquiler" o "compra"
- `neighborhood` - Barrio (opcional)
- `city` - Ciudad (opcional)
- `createdAt` - Fecha de creación
- `updatedAt` - Fecha de actualización

## Uso

1. **Añadir un piso:**
   - Haz clic en "Añadir Piso"
   - Completa el formulario
   - Haz clic en "Añadir Piso"

2. **Filtrar por tipo:**
   - Usa los botones "Alquiler" o "Compra" en el menú de filtros

3. **Filtrar por provincia:**
   - Selecciona una provincia del menú desplegable

4. **Filtrar por barrio:**
   - Selecciona un barrio del menú desplegable (se filtra según la provincia seleccionada)

5. **Filtrar por precio máximo:**
   - Selecciona un rango de precio máximo del menú desplegable

6. **Ver estadísticas:**
   - Las estadísticas se muestran automáticamente en la parte superior
   - Incluye precio promedio, superficie, habitaciones y distribución
   - Estadísticas por barrio ordenadas por rentabilidad (cuando hay datos de alquiler y compra)

7. **Eliminar un piso:**
   - Haz clic en "Eliminar" en la tarjeta del piso
   - Confirma la eliminación

8. **Ver en Idealista:**
   - Haz clic en "Ver en Idealista" para abrir el link en una nueva pestaña

## Importar datos

Puedes importar datos en formato JSON usando el script de importación:

```bash
node scripts/import-json.js archivo.json
```

El script acepta múltiples formatos de campos:
- `precio_venta_eur` o `precio_mensual_eur` o `precio_eur_mes` para el precio
- `metros_cuadrados` o `m2` para la superficie
- `barrio` o `neighborhood` para el barrio
- `direccion_publicada` o `publishedAddress` para la dirección

## Escalabilidad

La aplicación está diseñada para escalar fácilmente:

- **Múltiples provincias:** Añade nuevas provincias y barrios a través de la base de datos
- **Filtros dinámicos:** Los filtros se generan automáticamente según los datos disponibles
- **Cálculo de rentabilidad:** Se calcula automáticamente cuando hay datos de alquiler y compra para el mismo barrio
- **Estadísticas en tiempo real:** Se recalculan automáticamente según los filtros aplicados
