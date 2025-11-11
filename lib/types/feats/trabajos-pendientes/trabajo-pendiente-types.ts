/**
 * Type definitions for Trabajos Pendientes module
 *
 * Interfaces for managing pending work assignments (trabajos pendientes)
 * Includes client association and tracking information
 */

/**
 * Trabajo Pendiente - Main interface for pending work
 * Includes extra 'Nombre' field derived from client lookup
 */
export interface TrabajoPendiente {
  id?: string
  CI: string
  is_active: boolean
  estado: string
  fecha_inicio: string
  veces_visitado: number
  stopped_by?: string | null
  comentario?: string | null
  responsable_parada?: 'nosotros' | 'el cliente' | 'otro' | null
  created_at?: string
  updated_at?: string
  // Extra field (not in backend) - derived from client lookup
  Nombre?: string
}

/**
 * Data structure for creating a new trabajo pendiente
 * Sent to backend during POST operations
 */
export interface TrabajoPendienteCreateData {
  CI: string
  estado: string
  fecha_inicio: string
  is_active?: boolean
  veces_visitado?: number
  stopped_by?: string | null
  comentario?: string | null
  responsable_parada?: 'nosotros' | 'el cliente' | 'otro' | null
}

/**
 * API Response structure from backend
 */
export interface TrabajoPendienteResponse {
  success: boolean
  message: string
  data?: TrabajoPendiente | TrabajoPendiente[] | null
  trabajo_id?: string
}
