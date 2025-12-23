/**
 * Script para importar datos JSON a Railway usando la API
 * 
 * Uso:
 * node scripts/import-via-api.js <URL_DE_RAILWAY>
 * 
 * Ejemplo:
 * node scripts/import-via-api.js https://tu-app.up.railway.app
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const railwayUrl = process.argv[2]

if (!railwayUrl) {
  console.error('❌ Error: Debes proporcionar la URL de Railway')
  console.error('   Uso: node scripts/import-via-api.js <URL_DE_RAILWAY>')
  console.error('   Ejemplo: node scripts/import-via-api.js https://tu-app.up.railway.app')
  process.exit(1)
}

// Normalizar URL (quitar trailing slash)
const baseUrl = railwayUrl.replace(/\/$/, '')
const apiUrl = `${baseUrl}/api/import`

console.log('🚀 Importación a Railway vía API\n')
console.log(`📍 URL: ${baseUrl}`)
console.log(`🔗 Endpoint: ${apiUrl}\n`)
console.log('='.repeat(60))

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

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const postData = JSON.stringify(data)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = client.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`))
          }
        } catch (e) {
          reject(new Error(`Error parsing response: ${responseData}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

async function importFile(filePath) {
  const fileName = path.basename(filePath)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${fileName}`)
    return null
  }

  try {
    console.log(`📦 Importando ${fileName}...`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const jsonData = JSON.parse(fileContent)
    
    const listings = Array.isArray(jsonData) ? jsonData : [jsonData]
    
    console.log(`   Encontrados ${listings.length} pisos`)
    
    const result = await makeRequest(apiUrl, listings)
    
    console.log(`   ✅ Importados: ${result.imported}`)
    if (result.skipped > 0) {
      console.log(`   ⚠️  Omitidos (duplicados): ${result.skipped}`)
    }
    if (result.errors && result.errors.length > 0) {
      console.log(`   ❌ Errores: ${result.errors.length}`)
    }
    
    return result
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
    return { error: error.message }
  }
}

async function main() {
  let totalImported = 0
  let totalSkipped = 0
  let totalErrors = 0
  const errors = []

  // Primero, verificar que la API funciona
  console.log('🔍 Verificando conexión con Railway...\n')
  try {
    const testUrl = new URL(baseUrl)
    const testClient = testUrl.protocol === 'https:' ? https : http
    await new Promise((resolve, reject) => {
      const req = testClient.get(baseUrl, (res) => {
        resolve(res.statusCode)
      })
      req.on('error', reject)
      req.setTimeout(5000, () => {
        req.destroy()
        reject(new Error('Timeout'))
      })
    })
    console.log('✅ Conexión exitosa\n')
  } catch (error) {
    console.error('❌ No se pudo conectar a Railway')
    console.error(`   Verifica que la URL sea correcta: ${baseUrl}`)
    console.error(`   Error: ${error.message}`)
    process.exit(1)
  }

  // Importar cada archivo
  for (const file of files) {
    const filePath = path.join(process.cwd(), file)
    const result = await importFile(filePath)
    
    if (result) {
      if (result.error) {
        totalErrors++
        errors.push({ file, error: result.error })
      } else {
        totalImported += result.imported || 0
        totalSkipped += result.skipped || 0
        if (result.errors && result.errors.length > 0) {
          totalErrors += result.errors.length
        }
      }
    }
    
    console.log() // Línea en blanco entre archivos
  }

  // Resumen
  console.log('='.repeat(60))
  console.log('📊 RESUMEN DE IMPORTACIÓN')
  console.log('='.repeat(60))
  console.log(`✅ Total importados: ${totalImported}`)
  console.log(`⚠️  Total omitidos (duplicados): ${totalSkipped}`)
  if (totalErrors > 0) {
    console.log(`❌ Total errores: ${totalErrors}`)
  }
  console.log(`📁 Archivos procesados: ${files.length}`)

  if (errors.length > 0) {
    console.log(`\n❌ Errores encontrados:`)
    errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`)
    })
  }

  console.log('\n🎉 ¡Importación completada!')
  console.log(`\n💡 Verifica los datos en: ${baseUrl}`)
}

main().catch((error) => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})

