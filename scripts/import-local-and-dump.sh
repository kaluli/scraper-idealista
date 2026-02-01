#!/bin/bash

# Script para importar datos a la base local y crear dump para Railway
# Uso: ./scripts/import-local-and-dump.sh [URL_LOCAL_MYSQL]

set -e

LOCAL_DB_URL="${1:-mysql://root@localhost:3306/idealista_db}"

echo "🚀 Importando datos a la base de datos LOCAL y creando dump"
echo "📍 Base de datos local: $LOCAL_DB_URL"
echo ""

# Guardar DATABASE_URL actual
CURRENT_ENV=$(cat .env 2>/dev/null || echo "")

# Configurar DATABASE_URL temporalmente para la base local
echo "DATABASE_URL=\"$LOCAL_DB_URL\"" > .env.tmp
export DATABASE_URL="$LOCAL_DB_URL"

echo "📦 Paso 1: Creando tablas en la base local..."
npm run db:push > /dev/null 2>&1 || echo "⚠️  Tablas pueden ya existir"

echo "📦 Paso 2: Importando archivos JSON..."
echo ""

# Importar todos los archivos JSON
for file in pisos_*.json; do
  if [ -f "$file" ]; then
    echo "   Importando $file..."
    DATABASE_URL="$LOCAL_DB_URL" node scripts/import-json.js "$file" 2>&1 | grep -E "(Importados|Omitidos|Error)" || true
  fi
done

echo ""
echo "✅ Datos importados a la base local"
echo ""

# Extraer componentes de la URL para mysqldump
DB_USER=$(echo $LOCAL_DB_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p' || echo "root")
DB_PASS=$(echo $LOCAL_DB_URL | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p' || echo "")
DB_HOST=$(echo $LOCAL_DB_URL | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p' || echo "localhost")
DB_PORT=$(echo $LOCAL_DB_URL | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p' || echo "3306")
DB_NAME=$(echo $LOCAL_DB_URL | sed -n 's|mysql://[^/]*/\(.*\)|\1|p' || echo "idealista_db")

echo "📤 Paso 3: Creando dump de la base de datos..."
echo "   Host: $DB_HOST"
echo "   Puerto: $DB_PORT"
echo "   Base de datos: $DB_NAME"
echo ""

DUMP_FILE="dump_railway_$(date +%Y%m%d_%H%M%S).sql"

# Crear dump
if [ -n "$DB_PASS" ]; then
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$DUMP_FILE"
else
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" > "$DUMP_FILE"
fi

if [ $? -eq 0 ]; then
  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  echo "✅ Dump creado: $DUMP_FILE ($DUMP_SIZE)"
  echo ""
  echo "📤 Para importar a Railway:"
  echo ""
  echo "   1. Obtén la URL EXTERNA de Railway (no railway.internal)"
  echo "   2. Ejecuta:"
  echo "      mysql [URL_EXTERNA_RAILWAY] < $DUMP_FILE"
  echo ""
  echo "   O con mysqldump:"
  echo "      mysql -h [HOST] -P [PUERTO] -u [USUARIO] -p[PASSWORD] [DATABASE] < $DUMP_FILE"
  echo ""
else
  echo "❌ Error creando el dump"
  exit 1
fi

# Restaurar .env original si existía
if [ -n "$CURRENT_ENV" ]; then
  echo "$CURRENT_ENV" > .env
else
  rm -f .env
fi

rm -f .env.tmp

echo ""
echo "🎉 ¡Proceso completado!"

