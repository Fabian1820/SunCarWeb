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
