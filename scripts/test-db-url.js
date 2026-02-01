/**
 * Script para verificar DATABASE_URL desde Railway
 * Ejecutar en Railway para debug
 */

const url = process.env.DATABASE_URL || 'NOT SET'

console.log('DATABASE_URL length:', url.length)
console.log('DATABASE_URL starts with space:', url.startsWith(' '))
console.log('DATABASE_URL ends with space:', url.endsWith(' '))
console.log('DATABASE_URL first 30 chars:', JSON.stringify(url.substring(0, 30)))
console.log('DATABASE_URL starts with mysql://', url.trim().startsWith('mysql://'))
console.log('DATABASE_URL cleaned:', JSON.stringify(url.trim().substring(0, 30)))


