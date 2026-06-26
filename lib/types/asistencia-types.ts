/**
 * Tipos para el sistema de control de asistencia
 * Basado en la documentación de API_ASISTENCIA.md
 */

export interface UltimoMarcaje {
  id: string
  tipo: "entrada" | "salida"
  timestamp: string
  hace?: string
}

export interface EstadoOficina {
  trabajador_ci: string
  esta_en_oficina: boolean
  ultimo_marcaje: UltimoMarcaje | null
}

export interface EstadoOficinaResponse {
  success: boolean
  message: string
  data: EstadoOficina
}

export interface TrabajadorEnOficina {
  trabajador_ci: string
  nombre: string
  hora_entrada: string
  tiempo_en_oficina: string
}

export interface QuienEstaAhoraResponse {
  success: boolean
  message: string
  data: {
    total: number
    trabajadores: TrabajadorEnOficina[]
  }
}

export interface Asistencia {
  id: string
  trabajador_ci: string
  tipo: "entrada" | "salida"
  timestamp: string
  fecha: string
  registrado_por: string
  comentarios?: string | null
}

export interface TrabajadorReporte {
  trabajador_ci: string
  nombre: string
  esta_presente: boolean
  hora_entrada: string | null
  hora_salida: string | null
  horas_trabajadas: number | null
  estado_actual: "dentro" | "fuera"
}

export interface ResumenReporte {
  total_trabajadores: number
  presentes_hoy: number
  ausentes: number
  actualmente_en_oficina: number
}

export interface ReporteDiarioData {
  fecha: string
  trabajadores: TrabajadorReporte[]
  resumen: ResumenReporte
}

export interface ReporteDiarioResponse {
  success: boolean
  message: string
  data: ReporteDiarioData
}

export interface MarcarAsistenciaResponse {
  success: boolean
  message: string
  data: Asistencia
  tipo_marcaje: "entrada" | "salida"
}

export interface EliminarMarcajeResponse {
  success: boolean
  message: string
}
