#!/bin/bash

# Script para sincronizar la base de datos local con Railway
# Uso: ./scripts/sync-to-railway.sh [RAILWAY_DATABASE_URL]

set -e

echo "🔄 Sincronizando base de datos local con Railway..."
echo ""

# Verificar que existe el dump más reciente
DUMP_FILE=$(ls -t dump_sync_*.sql 2>/dev/null | head -1)

if [ -z "$DUMP_FILE" ]; then
    echo "❌ No se encontró ningún dump. Creando uno nuevo..."
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    DUMP_FILE="dump_sync_${TIMESTAMP}.sql"
    mysqldump -u root idealista_db > "$DUMP_FILE"
    echo "✅ Dump creado: $DUMP_FILE"
fi

echo "📋 Usando dump: $DUMP_FILE"
echo ""

# Obtener la URL de Railway
if [ -z "$1" ]; then
    echo "⚠️  No se proporcionó la URL de Railway."
    echo ""
    echo "Para usar este script, necesitas la URL externa de Railway."
    echo "Formato: mysql://root:PASSWORD@switchyard.proxy.rlwy.net:PORT/railway"
    echo ""
    echo "Obtén la URL desde:"
    echo "1. Railway Dashboard → Tu servicio MySQL → Variables"
    echo "2. Busca MYSQL_URL o DATABASE_URL"
    echo "3. Copia la URL externa (debe tener switchyard.proxy.rlwy.net o similar)"
    echo ""
    echo "Uso:"
    echo "  ./scripts/sync-to-railway.sh 'mysql://root:PASSWORD@HOST:PORT/railway'"
    echo ""
    exit 1
fi

RAILWAY_URL="$1"

# Extraer componentes de la URL
if [[ ! "$RAILWAY_URL" =~ mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
    echo "❌ Formato de URL incorrecto"
    echo "Formato esperado: mysql://root:PASSWORD@HOST:PORT/DATABASE"
    exit 1
fi

USER="${BASH_REMATCH[1]}"
PASSWORD="${BASH_REMATCH[2]}"
HOST="${BASH_REMATCH[3]}"
PORT="${BASH_REMATCH[4]}"
DATABASE="${BASH_REMATCH[5]}"

echo "🔗 Conectando a Railway..."
echo "   Host: $HOST"
echo "   Puerto: $PORT"
echo "   Base de datos: $DATABASE"
echo ""

# Verificar conexión
echo "🔍 Verificando conexión..."
if mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión. Verifica la URL y las credenciales."
    exit 1
fi

# Importar el dump
echo ""
echo "📤 Importando dump a Railway..."
echo "   Esto puede tardar unos minutos..."
echo ""

if mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" < "$DUMP_FILE"; then
    echo ""
    echo "✅ Dump importado exitosamente"
else
    echo ""
    echo "❌ Error al importar el dump"
    exit 1
fi

# Verificar datos
echo ""
echo "🔍 Verificando datos en Railway..."
LISTINGS_COUNT=$(mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" -N -e "SELECT COUNT(*) FROM listings;" 2>/dev/null)

echo "✅ Total de pisos en Railway: $LISTINGS_COUNT"

# Comparar con local
LOCAL_COUNT=$(mysql -u root idealista_db -N -e "SELECT COUNT(*) FROM listings;" 2>/dev/null)
echo "📊 Total de pisos en local: $LOCAL_COUNT"

if [ "$LISTINGS_COUNT" -eq "$LOCAL_COUNT" ]; then
    echo "✅ ¡Sincronización exitosa! Los datos coinciden."
else
    echo "⚠️  Los datos no coinciden. Puede haber diferencias."
fi

echo ""
echo "🎉 Proceso completado"


