// Orden de trabajo feature types used across the app.

export type TipoReporte = 'inversión' | 'avería' | 'mantenimiento'

export interface OrdenTrabajo {
  id: string
  brigada_id: string
  brigada_nombre?: string
  cliente_numero: string
  cliente_nombre: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string
  comentarios?: string
  fecha_creacion: string
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface CreateOrdenTrabajoRequest {
  brigada_id: string
  cliente_numero: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string
  comentarios?: string
}

export interface UpdateOrdenTrabajoRequest extends Partial<CreateOrdenTrabajoRequest> {
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface OrdenTrabajoResponse {
  success: boolean
  message: string
  data: OrdenTrabajo | OrdenTrabajo[] | null
}
