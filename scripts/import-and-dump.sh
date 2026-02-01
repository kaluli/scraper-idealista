#!/bin/bash

# Script para importar datos a la base de datos local y luego hacer dump para Railway
# Uso: ./scripts/import-and-dump.sh

echo "🚀 Importando datos a la base de datos LOCAL..."
echo ""

# Importar todos los archivos JSON a la base local
for file in pisos_*.json; do
  if [ -f "$file" ]; then
    echo "📦 Importando $file..."
    node scripts/import-json.js "$file"
    echo ""
  fi
done

echo "✅ Datos importados a la base local"
echo ""
echo "📤 Creando dump de la base de datos..."
echo ""

# Obtener DATABASE_URL del .env.local
DB_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2 | tr -d '"')

if [ -z "$DB_URL" ]; then
  echo "❌ Error: No se encontró DATABASE_URL en .env.local"
  exit 1
fi

# Extraer componentes de la URL
# mysql://usuario:password@host:puerto/database
DB_USER=$(echo $DB_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DB_URL | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DB_URL | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DB_URL | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo $DB_URL | sed -n 's|mysql://[^/]*/\(.*\)|\1|p')

echo "📋 Configuración de la base de datos:"
echo "   Host: $DB_HOST"
echo "   Puerto: $DB_PORT"
echo "   Base de datos: $DB_NAME"
echo ""

# Crear dump
DUMP_FILE="dump_$(date +%Y%m%d_%H%M%S).sql"
echo "💾 Creando dump: $DUMP_FILE"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$DUMP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Dump creado: $DUMP_FILE"
  echo ""
  echo "📤 Para importar a Railway, ejecuta:"
  echo "   mysql -h [HOST_RAILWAY] -P [PUERTO] -u [USUARIO] -p[PASSWORD] [DATABASE] < $DUMP_FILE"
  echo ""
  echo "   O usa la URL externa de Railway:"
  echo "   mysql [URL_EXTERNA_RAILWAY] < $DUMP_FILE"
else
  echo "❌ Error creando el dump"
  exit 1
fi

