/**
 * Utilidades para manejo de strings
 */

/**
 * Normaliza un string para comparación:
 * - Convierte a minúsculas
 * - Elimina tildes/acentos
 * - Elimina espacios extras
 * - Elimina caracteres especiales
 * 
 * @param str - String a normalizar
 * @returns String normalizado
 * 
 * @example
 * normalizeString("Técnico en Gestión Comercial") 
 * // Returns: "tecnicoengestioncomercial"
 * 
 * normalizeString("Director   General")
 * // Returns: "directorgeneral"
 */
export function normalizeString(str: string): string {
  if (!str) return ''
  
  return str
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con tildes
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas (tildes)
    .replace(/[^a-z0-9]/g, '') // Elimina todo excepto letras y números
    .trim()
}

/**
 * Compara dos strings ignorando mayúsculas, tildes y espacios
 * 
 * @param str1 - Primer string
 * @param str2 - Segundo string
 * @returns true si son iguales después de normalizar
 * 
 * @example
 * compareStrings("Técnico en Gestión Comercial", "tecnico en gestion comercial")
 * // Returns: true
 */
export function compareStrings(str1: string, str2: string): boolean {
  return normalizeString(str1) === normalizeString(str2)
}

/**
 * Verifica si un string contiene otro (ignorando mayúsculas, tildes, espacios)
 * 
 * @param haystack - String donde buscar
 * @param needle - String a buscar
 * @returns true si needle está contenido en haystack
 * 
 * @example
 * containsString("Técnico en Gestión Comercial", "gestion comercial")
 * // Returns: true
 */
export function containsString(haystack: string, needle: string): boolean {
  return normalizeString(haystack).includes(normalizeString(needle))
}
