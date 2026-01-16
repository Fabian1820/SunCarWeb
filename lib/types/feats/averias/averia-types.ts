export interface Averia {
  id: string
  descripcion: string
  estado: 'Pendiente' | 'Solucionada'
  fecha_reporte: string
  fecha_solucion?: string | null
  created_at?: string
  updated_at?: string
}

export interface AveriaCreateData {
  descripcion: string
  estado?: 'Pendiente' | 'Solucionada'
}

export interface AveriaUpdateData {
  descripcion?: string
  estado?: 'Pendiente' | 'Solucionada'
}

export interface AveriaResponse {
  success: boolean
  message: string
  data?: Averia
}
