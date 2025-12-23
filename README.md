# Gestor de Pisos Idealista

Aplicación web para gestionar pisos de alquiler y compra con filtros por tipo y barrios.

## Características

- ✅ Añadir pisos con información completa
- ✅ Eliminar pisos
- ✅ Filtros por tipo (Alquiler/Compra)
- ✅ Filtros por barrios
- ✅ Base de datos MySQL con Prisma
- ✅ Interfaz moderna con Marmalade Design System

## Campos de cada piso

- **Título del piso**
- **Precio** (€)
- **Metros cuadrados** (m²)
- **Link a Idealista**
- **Tasa de rentabilidad** (%)
- **Tipo** (Alquiler/Compra)
- **Barrio**
- **Ciudad**

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

3. **Filtrar por barrio:**
   - Selecciona un barrio del menú desplegable

4. **Eliminar un piso:**
   - Haz clic en "Eliminar" en la tarjeta del piso
   - Confirma la eliminación

5. **Ver en Idealista:**
   - Haz clic en "Ver en Idealista" para abrir el link en una nueva pestaña
