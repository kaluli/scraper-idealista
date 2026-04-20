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

// Misma BD que import-json (no depender solo del cwd del padre)
const root = path.resolve(__dirname, '..')
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) continue
  fs.readFileSync(p, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (!match) return
      const key = match[1].trim()
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key] = val
    })
}

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

const existingJson = files.filter((f) => fs.existsSync(path.join(process.cwd(), f)))
if (existingJson.length === 0) {
  console.error('❌ No hay ningún archivo JSON de la lista en la raíz del proyecto.')
  console.error('   Colocá aquí al menos uno (ej. pisos.json) o importá con:')
  console.error('   node scripts/import-json.js /ruta/completa/archivo.json')
  console.error('')
  process.exit(1)
}
console.log(`📁 Archivos encontrados (${existingJson.length}): ${existingJson.join(', ')}\n`)

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


