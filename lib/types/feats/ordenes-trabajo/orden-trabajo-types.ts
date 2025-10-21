// Orden de trabajo feature types used across the app.
// Backend types: inversion, averia, mantenimiento
export type TipoReporte = 'inversion' | 'averia' | 'mantenimiento'

// Backend brigada structure from view brigadas_completas
export interface BrigadaOrdenTrabajo {
  lider_ci: string
  lider_nombre: string
  lider_apellido: string
  integrantes: Array<{
    ci: string
    nombre: string
    apellido: string
  }>
}

// Backend cliente structure
export interface ClienteOrdenTrabajo {
  numero: string
  nombre: string
  apellido?: string
  telefono?: string
  direccion?: string
}

// Main OrdenTrabajo type matching backend response
export interface OrdenTrabajo {
  id: string
  brigada_lider_ci: string
  brigada?: BrigadaOrdenTrabajo // Populated from brigadas_completas view
  cliente_numero: string
  cliente?: ClienteOrdenTrabajo // Populated from clientes collection
  tipo_reporte: TipoReporte
  fecha: string // ISODate from backend
  comentarios?: string
}

// Request to create orden matching backend schema
export interface CreateOrdenTrabajoRequest {
  brigada_lider_ci: string
  cliente_numero: string
  tipo_reporte: TipoReporte
  fecha: string
  comentarios?: string
}

// Request to update orden - all fields optional per backend
export interface UpdateOrdenTrabajoRequest {
  brigada_lider_ci?: string
  cliente_numero?: string
  tipo_reporte?: TipoReporte
  fecha?: string
  comentarios?: string
}

// Backend response structure
export interface OrdenTrabajoResponse {
  success: boolean
  message: string
  data: OrdenTrabajo | OrdenTrabajo[] | null
}
