# Formato JSON Completo para Pisos

Este documento describe el formato JSON que se usa para guardar pisos en la base de datos.

## Formato Básico (Mínimo Requerido)

```json
{
  "link": "https://www.idealista.com/inmueble/110181729/",
  "precio_eur_mes": 900
}
```

## Formato Completo (Recomendado)

```json
{
  "link": "https://www.idealista.com/inmueble/110181729/",
  "barrio": "La Flota",
  "direccion_publicada": "Avenida de la Marina Española, 71",
  "precio_eur_mes": 900,
  "metros_cuadrados": 80,
  "habitaciones": 2,
  "titulo": "Piso en La Flota",
  "ciudad": "Murcia",
  "province": "Murcia",
  "tasa_rentabilidad": 5.5
}
```

## Campos y Mapeo a la Base de Datos

### Campos Requeridos

| Campo JSON | Campo DB | Tipo | Descripción |
|------------|----------|------|-------------|
| `link` | `link` | String (500) | URL completa de Idealista (requerido) |

### Campos Opcionales

| Campo JSON | Campo DB | Tipo | Descripción | Alternativas |
|------------|----------|------|-------------|--------------|
| `precio_eur_mes` | `price` | Float | Precio mensual (alquiler) | `precio_eur_mes`, `precio_venta_eur`, `precio` |
| `precio_venta_eur` | `price` | Float | Precio de venta (compra) | `precio_venta_eur`, `precio` |
| `precio` | `price` | Float | Precio genérico | `precio_mensual_eur`, `precio_eur_mes`, `precio_venta_eur`, `precio` |
| `barrio` | `neighborhood` (barrio) | String (100) | Nombre del barrio | `barrio`, `neighborhood` |
| `direccion_publicada` | `publishedAddress` (direccion_publicada) | String (255) | Dirección publicada | `direccion_publicada`, `publishedAddress` |
| `metros_cuadrados` | `surface` (metros_cuadrados) | Float | Metros cuadrados | `m2`, `metros_cuadrados`, `surface` |
| `habitaciones` | `rooms` (habitaciones) | Int | Número de habitaciones | `habitaciones` |
| `titulo` | `title` | String (255) | Título del piso | `titulo`, `title` |
| `ciudad` | `city` | String (100) | Ciudad | `ciudad`, `city` |
| `province` | `province` | String (100) | Provincia | `province` (por defecto: "Murcia") |
| `tasa_rentabilidad` | `profitabilityRate` (tasa_rentabilidad) | Float | Tasa de rentabilidad (%) | `tasa_rentabilidad`, `profitabilityRate` |

## Determinación del Tipo (alquiler/compra)

El tipo se determina automáticamente según los campos de precio:

- **Alquiler**: Si existe `precio_mensual_eur` o `precio_eur_mes`
- **Compra**: Si existe `precio_venta_eur` o solo `precio` (sin prefijo mensual)

## Ejemplos por Tipo

### Ejemplo: Alquiler

```json
{
  "link": "https://www.idealista.com/inmueble/110181729/",
  "barrio": "La Flota",
  "direccion_publicada": "Avenida de la Marina Española, 71",
  "precio_eur_mes": 900,
  "metros_cuadrados": 80,
  "habitaciones": 2,
  "titulo": "Piso en La Flota",
  "ciudad": "Murcia",
  "province": "Murcia"
}
```

### Ejemplo: Compra

```json
{
  "link": "https://www.idealista.com/inmueble/120181730/",
  "barrio": "Centro – Santa Eulalia",
  "direccion_publicada": "Calle Balsas, 10",
  "precio_venta_eur": 172000,
  "metros_cuadrados": 90,
  "habitaciones": 3,
  "titulo": "Piso en Calle Balsas",
  "ciudad": "Murcia",
  "province": "Murcia",
  "tasa_rentabilidad": 4.2
}
```

## Normalización de Barrios

El sistema normaliza automáticamente los nombres de barrios:

- `"Juan Carlos I"`, `"Juan de Borbón"`, `"Avenida de Europa"` → `"Juan Carlos I (Juan de Borbón)"`
- `"Santa Eulalia"`, `"Centro – Santa Eulalia"` → `"Centro – Santa Eulalia"`
- `"Espinardo"` → `"Espinardo"`
- `"San Lorenzo"` → `"San Lorenzo"`
- `"Vistalegre"` → `"Vistalegre"`
- `"El Carmen"` → `"El Carmen"`

## Extracción de Ciudad desde Barrio

Si el barrio incluye la ciudad separada por coma, se extrae automáticamente:

```json
{
  "barrio": "La Flota, Murcia"
}
```

Se convierte en:
- `neighborhood`: `"La Flota"`
- `city`: `"Murcia"`

## Formato de Array (Importación Masiva)

Para importar múltiples pisos, envía un array:

```json
[
  {
    "link": "https://www.idealista.com/inmueble/110181729/",
    "barrio": "La Flota",
    "direccion_publicada": "Avenida de la Marina Española, 71",
    "precio_eur_mes": 900,
    "metros_cuadrados": 80,
    "habitaciones": 2
  },
  {
    "link": "https://www.idealista.com/inmueble/110181730/",
    "barrio": "Centro – Santa Eulalia",
    "direccion_publicada": "Calle Balsas, 10",
    "precio_venta_eur": 172000,
    "metros_cuadrados": 90,
    "habitaciones": 3
  }
]
```

## Estructura en la Base de Datos

```sql
CREATE TABLE listings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  price FLOAT NOT NULL,
  surface FLOAT,
  link VARCHAR(500) NOT NULL,
  profitabilityRate FLOAT,
  type VARCHAR(20) NOT NULL,  -- 'alquiler' o 'compra'
  neighborhood VARCHAR(100),   -- barrio
  city VARCHAR(100),
  province VARCHAR(100),
  publishedAddress VARCHAR(255),  -- direccion_publicada
  rooms INT,                      -- habitaciones
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Validaciones

1. **Link requerido**: Si no hay `link`, el piso se omite
2. **Duplicados**: Si el `link` ya existe, el piso se omite (no se actualiza)
3. **Precio**: Si no hay precio, se usa `0` por defecto
4. **Provincia**: Si no se especifica, se usa `"Murcia"` por defecto

## Métodos de Importación

### 1. API REST (`/api/import`)

```bash
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '[
    {
      "link": "https://www.idealista.com/inmueble/110181729/",
      "barrio": "La Flota",
      "precio_eur_mes": 900
    }
  ]'
```

### 2. Script de Importación

```bash
# Importar un archivo JSON
node scripts/import-json.js datos.json

# O desde stdin
cat datos.json | node scripts/import-json.js
```

### 3. Importación Masiva vía API

```bash
node scripts/import-via-api.js https://tu-app.railway.app
```

## Notas Importantes

- El campo `link` es único y se usa para detectar duplicados
- Los campos numéricos (`precio`, `metros_cuadrados`, `habitaciones`) se convierten automáticamente
- Los campos de texto se truncan si exceden el límite de caracteres
- Las fechas (`created_at`, `updated_at`) se generan automáticamente


