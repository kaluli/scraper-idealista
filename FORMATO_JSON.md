# Formato JSON para Importar Pisos

La aplicación acepta datos en formato JSON del scraper. Puedes importar datos de dos formas:

## Formato del Scraper (Recomendado)

```json
{
  "link": "https://www.idealista.com/inmueble/110181729/",
  "barrio": "La Flota",
  "direccion_publicada": "Avenida de la Marina Española, 71",
  "precio_eur_mes": 900,
  "metros_cuadrados": 80,
  "habitaciones": 2
}
```

## Formato Completo (con campos opcionales)

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
  "tasa_rentabilidad": 5.5
}
```

## Campos Requeridos

- `link` - URL de Idealista (requerido)
- `precio_eur_mes` o `precio` - Precio (requerido)

## Campos Opcionales

- `barrio` - Barrio
- `direccion_publicada` - Dirección publicada
- `metros_cuadrados` - Metros cuadrados
- `habitaciones` - Número de habitaciones
- `titulo` - Título del piso
- `ciudad` - Ciudad
- `tasa_rentabilidad` - Tasa de rentabilidad (%)

## Importar Datos

### Opción 1: API REST

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://www.idealista.com/inmueble/110181729/",
    "barrio": "La Flota",
    "direccion_publicada": "Avenida de la Marina Española, 71",
    "precio_eur_mes": 900,
    "metros_cuadrados": 80,
    "habitaciones": 2
  }'
```

### Opción 2: Script de Importación

```bash
# Importar un archivo JSON
node scripts/import-json.js datos.json

# O desde stdin
echo '{"link":"...","barrio":"...","precio_eur_mes":900}' | node scripts/import-json.js
```

### Opción 3: Desde la Interfaz Web

1. Abre http://localhost:3000
2. Haz clic en "Añadir Piso"
3. Completa el formulario
4. Guarda

## Notas

- Si `precio_eur_mes` está presente, el tipo se establece automáticamente como "alquiler"
- Si solo hay `precio`, el tipo se establece como "compra"
- El campo `type` puede especificarse manualmente como "alquiler" o "compra"

