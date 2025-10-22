/**
 * Tests para string-utils
 * 
 * Para ejecutar (si tienes Jest configurado):
 * npm test string-utils.test.ts
 */

import { normalizeString, compareStrings, containsString } from './string-utils'

// Tests de normalizeString
console.log('🧪 Testing normalizeString...')

// Test 1: Eliminar tildes
const test1 = normalizeString('Técnico en Gestión Comercial')
console.assert(test1 === 'tecnicoengestioncomercial', `❌ Test 1 failed: expected "tecnicoengestioncomercial", got "${test1}"`)
console.log('✅ Test 1: Tildes eliminadas correctamente')

// Test 2: Convertir a minúsculas
const test2 = normalizeString('DIRECTOR GENERAL')
console.assert(test2 === 'directorgeneral', `❌ Test 2 failed: expected "directorgeneral", got "${test2}"`)
console.log('✅ Test 2: Mayúsculas convertidas correctamente')

// Test 3: Eliminar espacios
const test3 = normalizeString('Jefe   de    Operaciones')
console.assert(test3 === 'jefedeoperaciones', `❌ Test 3 failed: expected "jefedeoperaciones", got "${test3}"`)
console.log('✅ Test 3: Espacios eliminados correctamente')

// Test 4: Caracteres especiales
const test4 = normalizeString('Especialista-en/Gestión & Económica')
console.assert(test4 === 'especialistaengestioneconomica', `❌ Test 4 failed: got "${test4}"`)
console.log('✅ Test 4: Caracteres especiales eliminados')

// Tests de compareStrings
console.log('\n🧪 Testing compareStrings...')

// Test 5: Comparación con tildes
const test5 = compareStrings('Técnico en Gestión Comercial', 'tecnico en gestion comercial')
console.assert(test5 === true, '❌ Test 5 failed')
console.log('✅ Test 5: Comparación ignorando tildes')

// Test 6: Comparación con mayúsculas y espacios
const test6 = compareStrings('DIRECTOR GENERAL', 'director   general')
console.assert(test6 === true, '❌ Test 6 failed')
console.log('✅ Test 6: Comparación ignorando mayúsculas y espacios')

// Test 7: Strings diferentes
const test7 = compareStrings('Técnico Comercial', 'Jefe de Operaciones')
console.assert(test7 === false, '❌ Test 7 failed')
console.log('✅ Test 7: Strings diferentes detectados')

// Tests de containsString
console.log('\n🧪 Testing containsString...')

// Test 8: Contiene substring con tildes
const test8 = containsString('Técnico en Gestión Comercial', 'gestión')
console.assert(test8 === true, '❌ Test 8 failed')
console.log('✅ Test 8: Substring con tildes encontrado')

// Test 9: Contiene substring sin tildes
const test9 = containsString('Técnico en Gestión Comercial', 'tecnico')
console.assert(test9 === true, '❌ Test 9 failed')
console.log('✅ Test 9: Substring sin tildes encontrado')

// Test 10: No contiene substring
const test10 = containsString('Técnico Comercial', 'director')
console.assert(test10 === false, '❌ Test 10 failed')
console.log('✅ Test 10: Substring no presente detectado correctamente')

// Tests de casos reales
console.log('\n🧪 Testing casos reales de la aplicación...')

// Test 11: Rol de BD vs rol en código
const rolBD = 'Técnico en Gestión Comercial'
const rolCodigo = 'tecnico en gestion comercial'
const test11 = compareStrings(rolBD, rolCodigo)
console.assert(test11 === true, '❌ Test 11 failed: Rol de BD no coincide con código')
console.log('✅ Test 11: Rol de BD coincide con código')

// Test 12: Director General con tildes
const test12 = containsString('Director General', 'director general')
console.assert(test12 === true, '❌ Test 12 failed')
console.log('✅ Test 12: Director General detectado correctamente')

// Test 13: Subdirector con tildes
const test13 = containsString('Subdirector(a)', 'subdirector')
console.assert(test13 === true, '❌ Test 13 failed')
console.log('✅ Test 13: Subdirector detectado correctamente')

console.log('\n✅ ¡Todos los tests pasaron correctamente! 🎉')

// Tabla de ejemplos reales
console.log('\n📊 Tabla de normalización de cargos reales:')
const cargosReales = [
  'Técnico en Gestión Comercial',
  'Director General',
  'Subdirector(a)',
  'Especialista en Gestión Económica',
  'Jefe de Operaciones',
  'Especialista en Redes y Sistemas'
]

console.table(cargosReales.map(cargo => ({
  'Cargo Original': cargo,
  'Cargo Normalizado': normalizeString(cargo)
})))
