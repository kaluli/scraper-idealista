/**
 * Script helper para importar datos a Railway
 * 
 * Este script te ayuda a:
 * 1. Verificar que DATABASE_URL esté configurada
 * 2. Crear las tablas si no existen
 * 3. Importar todos los archivos JSON
 * 
 * Uso:
 * node scripts/import-to-railway.js
 * 
 * IMPORTANTE: Asegúrate de tener la URL de Railway en tu .env.local
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Importación a Railway\n')
console.log('='.repeat(60))

// Verificar que DATABASE_URL esté configurada
const envFile = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envFile)) {
  console.error('❌ Error: No se encontró .env.local')
  console.error('   Crea el archivo .env.local con tu DATABASE_URL de Railway')
  process.exit(1)
}

const envContent = fs.readFileSync(envFile, 'utf-8')
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/)

if (!dbUrlMatch) {
  console.error('❌ Error: No se encontró DATABASE_URL en .env.local')
  console.error('   Añade: DATABASE_URL="mysql://..."')
  process.exit(1)
}

const dbUrl = dbUrlMatch[1]

// Verificar que sea una URL de Railway (contiene 'railway.app' o 'containers')
if (!dbUrl.includes('railway') && !dbUrl.includes('containers')) {
  console.warn('⚠️  Advertencia: La URL no parece ser de Railway')
  console.warn('   Asegúrate de que estés usando la URL correcta')
  console.log()
}

console.log('✅ DATABASE_URL encontrada')
console.log(`   ${dbUrl.substring(0, 50)}...`)
console.log()

// Paso 1: Crear las tablas
console.log('📋 Paso 1: Creando tablas en la base de datos...')
console.log('   Ejecutando: npm run db:push')
console.log()

try {
  execSync('npm run db:push', {
    stdio: 'inherit',
    cwd: process.cwd()
  })
  console.log('✅ Tablas creadas correctamente\n')
} catch (error) {
  console.error('❌ Error creando las tablas')
  console.error('   Verifica que la URL de la base de datos sea correcta')
  process.exit(1)
}

// Paso 2: Importar archivos JSON
console.log('📦 Paso 2: Importando archivos JSON...')
console.log()

const files = [
  'pisos_espinardo.json',
  'pisos_juan_carlos.json',
  'pisos_juan_carlos_2.json',
  'pisos_juan_carlos_compra.json',
  'pisos_san_lorenzo.json',
  'pisos_santa_eulalia.json',
  'pisos_santa_eulalia_compra.json',
  'pisos_vistalegre.json',
  'pisos_nuevos.json',
  'pisos.json'
]

let totalImported = 0
let totalSkipped = 0
let errors = []

for (const file of files) {
  const filePath = path.join(process.cwd(), file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${file}`)
    continue
  }

  try {
    console.log(`📦 Importando ${file}...`)
    const output = execSync(`node scripts/import-json.js "${filePath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    
    console.log(output)
    
    // Extraer estadísticas del output
    const importedMatch = output.match(/Importados: (\d+)/)
    const skippedMatch = output.match(/Omitidos.*?: (\d+)/)
    
    if (importedMatch) {
      totalImported += parseInt(importedMatch[1])
    }
    if (skippedMatch) {
      totalSkipped += parseInt(skippedMatch[1])
    }
    
    console.log(`✅ ${file} completado\n`)
  } catch (error) {
    console.error(`❌ Error importando ${file}:`, error.message)
    errors.push({ file, error: error.message })
  }
}

// Resumen
console.log('\n' + '='.repeat(60))
console.log('📊 RESUMEN DE IMPORTACIÓN')
console.log('='.repeat(60))
console.log(`✅ Total importados: ${totalImported}`)
console.log(`⚠️  Total omitidos (duplicados): ${totalSkipped}`)
console.log(`📁 Archivos procesados: ${files.length}`)

if (errors.length > 0) {
  console.log(`\n❌ Errores encontrados: ${errors.length}`)
  errors.forEach(({ file, error }) => {
    console.log(`   - ${file}: ${error}`)
  })
}

console.log('\n🎉 ¡Importación a Railway completada!')
console.log('\n💡 Recordatorio:')
console.log('   Si quieres volver a usar tu base de datos local,')
console.log('   cambia DATABASE_URL en .env.local')

