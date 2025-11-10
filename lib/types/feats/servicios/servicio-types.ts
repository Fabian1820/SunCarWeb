// Tipos para el módulo de Servicios

/**
 * Entidad Servicio (catálogo de servicios)
 * Nota: El costo NO se almacena aquí porque es variable por cliente/oferta
 */
export interface Servicio {
  id?: string
  descripcion: string
  is_active: boolean
}

/**
 * Request para crear un servicio
 */
export interface ServicioCreateRequest {
  descripcion: string
  is_active?: boolean
}

/**
 * Request para actualizar un servicio (todos los campos opcionales)
 */
export interface ServicioUpdateRequest {
  descripcion?: string
  is_active?: boolean
}

/**
 * Versión simplificada de Servicio para selectores
 */
export interface ServicioSimplificado {
  id: string
  descripcion: string
}
