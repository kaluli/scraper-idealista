# Guía de Configuración - Gestor de Pisos Idealista

## Paso 1: Instalar MySQL

Si no tienes MySQL instalado:

### macOS (con Homebrew):
```bash
brew install mysql
brew services start mysql
```

### O descarga MySQL desde:
https://dev.mysql.com/downloads/mysql/

## Paso 2: Crear la Base de Datos

1. Conecta a MySQL:
```bash
mysql -u root -p
```

2. Crea la base de datos:
```sql
CREATE DATABASE idealista_db;
EXIT;
```

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="mysql://root:tu_password@localhost:3306/idealista_db"
```

**Reemplaza:**
- `root` por tu usuario de MySQL
- `tu_password` por tu contraseña de MySQL
- `idealista_db` por el nombre de tu base de datos (si usaste otro)

## Paso 4: Crear las Tablas

Ejecuta:
```bash
npm run db:push
```

Esto creará automáticamente todas las tablas necesarias.

## Paso 5: Iniciar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## Verificar que Todo Funciona

1. Abre http://localhost:3000
2. Haz clic en "Añadir Piso"
3. Completa el formulario
4. Guarda el piso
5. Deberías verlo en la lista

## Comandos Útiles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run db:generate` - Regenerar cliente Prisma
- `npm run db:push` - Sincronizar esquema con BD
- `npm run db:studio` - Abrir Prisma Studio (interfaz visual de BD)

## Solución de Problemas

### Error: "Can't reach database server"
- Verifica que MySQL esté corriendo: `brew services list` (macOS)
- Verifica la URL en `.env`
- Verifica usuario y contraseña

### Error: "Access denied"
- Verifica que el usuario tenga permisos
- Prueba con el usuario `root` y su contraseña

### Error: "Unknown database"
- Crea la base de datos primero (ver Paso 2)

