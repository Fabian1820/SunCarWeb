// Orden de trabajo feature types used across the app.
// Backend types: inversion, averia, mantenimiento
export type TipoReporte = 'inversion' | 'averia' | 'mantenimiento'

export interface TrabajadorOrdenTrabajo {
  id: string
  nombre: string
  CI: string
  rol: string
  tiene_contraseña: boolean
}

export interface BrigadaOrdenTrabajo {
  id?: string
  lider: TrabajadorOrdenTrabajo
  integrantes: TrabajadorOrdenTrabajo[]
}

export interface ClienteOrdenTrabajo {
  numero: string
  nombre: string
  direccion: string
  latitud: number | null
  longitud: number | null
  telefono: string | null
  carnet_identidad: string | null
  equipo_instalado: null
  fecha_instalacion: string | null
}

// Main OrdenTrabajo type matching backend response
export interface OrdenTrabajo {
  id: string
  brigada: BrigadaOrdenTrabajo
  cliente: ClienteOrdenTrabajo
  tipo_reporte: TipoReporte
  fecha: string // ISO string
  comentarios?: string | null
  comentario_transporte?: string | null
}

// Single orden payload used inside bulk creation
export interface CreateOrdenTrabajoItem {
  brigada_lider_ci: string
  cliente_numero: string
  tipo_reporte: TipoReporte
  fecha: string
  comentarios?: string
  comentario_transporte?: string
}

// Request to create one or more órdenes
export interface CreateOrdenTrabajoRequest {
  ordenes: CreateOrdenTrabajoItem[]
}

// Request to update orden - all fields optional per backend
export interface UpdateOrdenTrabajoRequest {
  brigada_lider_ci?: string
  cliente_numero?: string
  tipo_reporte?: TipoReporte
  fecha?: string
  comentarios?: string
  comentario_transporte?: string
}

export interface CreateOrdenTrabajoResponse {
  ids: string[]
  message: string
  total: number
}

export interface ListOrdenesTrabajoResponse {
  ordenes: OrdenTrabajo[]
  total: number
}
