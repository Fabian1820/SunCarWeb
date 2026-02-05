/**
 * Utilidad para sincronizar fuentes personalizadas entre la base de datos y localStorage
 */

const FUENTES_BASE = ['Página Web', 'Instagram', 'Facebook', 'Directo', 'Mensaje de Whatsapp', 'Visita']
const STORAGE_KEY = 'fuentes_personalizadas'
const EXCLUDED_KEY = 'fuentes_excluidas' // Fuentes que el usuario eliminó manualmente
const STORAGE_EVENT = 'fuentes_updated'

/**
 * Dispara un evento personalizado cuando las fuentes cambian
 */
function dispatchFuentesUpdatedEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT))
  }
}

/**
 * Obtiene las fuentes que el usuario ha excluido manualmente
 */
function obtenerFuentesExcluidas(): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_KEY)
    if (stored) {
      const excluidas = JSON.parse(stored) as string[]
      return Array.isArray(excluidas) ? excluidas : []
    }
  } catch (error) {
    console.error('Error al leer fuentes excluidas:', error)
  }
  return []
}

/**
 * Guarda las fuentes excluidas en localStorage
 */
function guardarFuentesExcluidas(fuentes: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_KEY, JSON.stringify(fuentes))
  } catch (error) {
    console.error('Error al guardar fuentes excluidas:', error)
  }
}

/**
 * Obtiene todas las fuentes únicas de leads y clientes
 */
export function extraerFuentesUnicas(
  leads: Array<{ fuente?: string }>,
  clientes: Array<{ fuente?: string }>
): string[] {
  const todasLasFuentes = new Set<string>()

  // Extraer fuentes de leads
  leads.forEach(lead => {
    if (lead.fuente && lead.fuente.trim() !== '') {
      todasLasFuentes.add(lead.fuente.trim())
    }
  })

  // Extraer fuentes de clientes
  clientes.forEach(cliente => {
    if (cliente.fuente && cliente.fuente.trim() !== '') {
      todasLasFuentes.add(cliente.fuente.trim())
    }
  })

  return Array.from(todasLasFuentes).sort()
}

/**
 * Filtra solo las fuentes personalizadas (que no están en las base)
 */
export function filtrarFuentesPersonalizadas(fuentes: string[]): string[] {
  return fuentes.filter(fuente => !FUENTES_BASE.includes(fuente))
}

/**
 * Obtiene las fuentes personalizadas guardadas en localStorage
 */
export function obtenerFuentesDeLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const personalizadas = JSON.parse(stored) as string[]
      return Array.isArray(personalizadas) ? personalizadas : []
    }
  } catch (error) {
    console.error('Error al leer fuentes de localStorage:', error)
  }
  return []
}

/**
 * Guarda las fuentes personalizadas en localStorage y dispara evento
 */
export function guardarFuentesEnLocalStorage(fuentes: string[]): void {
  try {
    const personalizadas = filtrarFuentesPersonalizadas(fuentes)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personalizadas))
    dispatchFuentesUpdatedEvent()
  } catch (error) {
    console.error('Error al guardar fuentes en localStorage:', error)
  }
}

/**
 * Elimina una fuente y la marca como excluida
 */
export function eliminarFuente(fuente: string): void {
  // Obtener fuentes actuales
  const fuentesActuales = obtenerFuentesDeLocalStorage()
  const nuevasFuentes = fuentesActuales.filter(f => f !== fuente)
  
  // Guardar fuentes actualizadas
  guardarFuentesEnLocalStorage(nuevasFuentes)
  
  // Agregar a la lista de excluidas
  const excluidas = obtenerFuentesExcluidas()
  if (!excluidas.includes(fuente)) {
    excluidas.push(fuente)
    guardarFuentesExcluidas(excluidas)
  }
}

/**
 * Sincroniza las fuentes de la base de datos con localStorage
 * Combina las fuentes existentes en localStorage con las nuevas de la BD
 * Respeta las fuentes que el usuario ha excluido manualmente
 */
export function sincronizarFuentesConBD(
  leads: Array<{ fuente?: string }>,
  clientes: Array<{ fuente?: string }>
): string[] {
  // Obtener fuentes excluidas por el usuario
  const fuentesExcluidas = obtenerFuentesExcluidas()
  
  // Obtener fuentes de localStorage
  const fuentesLocalStorage = obtenerFuentesDeLocalStorage()

  // Extraer fuentes de la BD
  const fuentesBD = extraerFuentesUnicas(leads, clientes)
  const fuentesPersonalizadasBD = filtrarFuentesPersonalizadas(fuentesBD)

  // Combinar ambas listas sin duplicados y filtrar las excluidas
  const todasLasPersonalizadas = [...new Set([...fuentesLocalStorage, ...fuentesPersonalizadasBD])]
    .filter(fuente => !fuentesExcluidas.includes(fuente))
    .sort()

  // Guardar la lista combinada en localStorage (sin disparar evento para evitar loops)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todasLasPersonalizadas))
  } catch (error) {
    console.error('Error al guardar fuentes en localStorage:', error)
  }

  // Retornar todas las fuentes (base + personalizadas)
  return [...FUENTES_BASE, ...todasLasPersonalizadas]
}

/**
 * Obtiene todas las fuentes disponibles (base + personalizadas de localStorage)
 */
export function obtenerTodasLasFuentes(): string[] {
  const personalizadas = obtenerFuentesDeLocalStorage()
  return [...FUENTES_BASE, ...personalizadas]
}

/**
 * Agrega una nueva fuente personalizada y la quita de la lista de excluidas
 */
export function agregarFuentePersonalizada(fuente: string): void {
  if (!fuente || fuente.trim() === '' || FUENTES_BASE.includes(fuente)) {
    return
  }

  const fuentesActuales = obtenerFuentesDeLocalStorage()
  if (!fuentesActuales.includes(fuente)) {
    const nuevasFuentes = [...fuentesActuales, fuente].sort()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevasFuentes))
    
    // Quitar de la lista de excluidas si estaba ahí
    const excluidas = obtenerFuentesExcluidas()
    const nuevasExcluidas = excluidas.filter(f => f !== fuente)
    if (nuevasExcluidas.length !== excluidas.length) {
      guardarFuentesExcluidas(nuevasExcluidas)
    }
    
    dispatchFuentesUpdatedEvent()
  }
}

/**
 * Limpia la lista de fuentes excluidas (útil para resetear)
 */
export function limpiarFuentesExcluidas(): void {
  try {
    localStorage.removeItem(EXCLUDED_KEY)
  } catch (error) {
    console.error('Error al limpiar fuentes excluidas:', error)
  }
}

/**
 * Hook para escuchar cambios en las fuentes
 */
export function useFuentesListener(callback: () => void) {
  if (typeof window === 'undefined') return

  const handleUpdate = () => {
    callback()
  }

  window.addEventListener(STORAGE_EVENT, handleUpdate)
  
  return () => {
    window.removeEventListener(STORAGE_EVENT, handleUpdate)
  }
}
