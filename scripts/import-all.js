/**
 * Script para importar todos los archivos JSON de pisos
 * 
 * Uso:
 * node scripts/import-all.js
 * 
 * Importa todos los archivos pisos_*.json del directorio raíz
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

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

console.log('🚀 Iniciando importación de todos los archivos...\n')

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

console.log('\n' + '='.repeat(50))
console.log('📊 RESUMEN DE IMPORTACIÓN')
console.log('='.repeat(50))
console.log(`✅ Total importados: ${totalImported}`)
console.log(`⚠️  Total omitidos (duplicados): ${totalSkipped}`)
console.log(`📁 Archivos procesados: ${files.length}`)

if (errors.length > 0) {
  console.log(`\n❌ Errores encontrados: ${errors.length}`)
  errors.forEach(({ file, error }) => {
    console.log(`   - ${file}: ${error}`)
  })
}

console.log('\n🎉 ¡Importación completada!')


