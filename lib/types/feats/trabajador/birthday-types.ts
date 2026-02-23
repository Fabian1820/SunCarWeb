/**
 * Birthday Types - Tipos para el sistema de cumpleaños
 */

export interface TrabajadorBirthdayInfo {
  CI: string
  nombre: string
  cargo: string
}

export interface BirthdaysResponse {
  success: boolean
  message: string
  data: TrabajadorBirthdayInfo[]
}

export interface BirthdayCheckStorage {
  lastCheckedDate: string // ISO date string (YYYY-MM-DD)
  hasShownToday: boolean
}
