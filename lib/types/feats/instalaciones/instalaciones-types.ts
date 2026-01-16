import type { LeadPendienteInstalacion, ClientePendienteInstalacion } from '@/lib/services/feats/instalaciones/instalaciones-service'

/**
 * Tipo unificado para mostrar instalaciones en la tabla
 * Combina leads y clientes pendientes de instalación
 */
export interface InstalacionNueva {
  tipo: 'lead' | 'cliente'
  id: string
  numero?: string
  nombre: string
  telefono: string
  direccion: string
  ofertas?: any[]
  estado: string
  fecha_contacto?: string
  falta_instalacion?: string
  // Datos originales
  original: LeadPendienteInstalacion | ClientePendienteInstalacion
}
