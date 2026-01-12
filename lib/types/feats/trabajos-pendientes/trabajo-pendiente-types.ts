/**
 * Type definitions for Trabajos Pendientes module
 *
 * Interfaces for managing pending work assignments (trabajos pendientes)
 * Includes client association and tracking information
 */

/**
 * Archivo adjunto en trabajo pendiente
 */
export interface ArchivoTrabajo {
  id: string
  url: string
  tipo: 'imagen' | 'video' | 'audio' | 'documento'
  nombre: string
  tamano?: number
  mime_type?: string
  created_at: string
}

/**
 * Trabajo Pendiente - Main interface for pending work
 * Includes extra 'Nombre' field derived from client lookup
 */
export interface TrabajoPendiente {
  id?: string
  CI?: string // Ahora opcional porque puede ser un lead
  lead_id?: string // ID del lead si aplica
  is_active: boolean
  estado: string
  fecha_inicio: string
  veces_visitado: number
  stopped_by?: string | null
  comentario?: string | null
  responsable_parada?: 'nosotros' | 'el cliente' | 'otro' | null
  archivos?: ArchivoTrabajo[]
  created_at?: string
  updated_at?: string
  // Extra fields (not in backend) - derived from lookups
  Nombre?: string
  tipo_referencia?: 'cliente' | 'lead' // Para saber si es cliente o lead
}

/**
 * Data structure for creating a new trabajo pendiente
 * Sent to backend during POST operations
 */
export interface TrabajoPendienteCreateData {
  CI?: string // Opcional si se usa lead_id
  lead_id?: string // Opcional si se usa CI
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
