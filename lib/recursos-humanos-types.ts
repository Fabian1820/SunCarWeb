// Tipos para el módulo de Recursos Humanos basados en la API

/**
 * Trabajador con datos de RRHH
 */
export interface TrabajadorRRHH {
  CI: string
  nombre: string
  cargo: string
  salario_fijo: number
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  alimentacion: number
  dias_trabajables: number
  dias_no_trabajados: number[] // Array de días del mes (1-31)
  is_brigadista?: boolean // Indica si el trabajador es brigadista
  tiene_contraseña?: boolean // Indica si tiene contraseña asignada
}

/**
 * Ingreso mensual de la empresa
 */
export interface IngresoMensual {
  id: string
  mes: number // 1-12
  anio: number // >= 2000
  monto: number // >= 0
  moneda: "CUP" | "USD" | "EUR"
}

/**
 * Respuesta completa del endpoint /api/recursos-humanos/
 */
export interface RecursosHumanosResponse {
  trabajadores: TrabajadorRRHH[]
  ultimo_ingreso_mensual: IngresoMensual | null
}

/**
 * Request para actualizar datos de RRHH de un trabajador
 * Todos los campos son opcionales
 */
export interface ActualizarTrabajadorRRHHRequest {
  cargo?: string
  salario_fijo?: number
  porcentaje_fijo_estimulo?: number
  porcentaje_variable_estimulo?: number
  alimentacion?: number
  dias_trabajables?: number
  dias_no_trabajados?: number[]
}

/**
 * Request para crear un trabajador completo desde RRHH
 */
export interface CrearTrabajadorRRHHRequest {
  ci: string
  nombre: string
  cargo?: string
  salario_fijo?: number
  porcentaje_fijo_estimulo?: number
  porcentaje_variable_estimulo?: number
  alimentacion?: number
  dias_trabajables?: number
  is_brigadista?: boolean
  contrasena?: string
}

/**
 * Request para crear/actualizar ingreso mensual
 */
export interface IngresoMensualRequest {
  mes: number // 1-12
  anio: number // >= 2000
  monto: number // >= 0
  moneda?: "CUP" | "USD" | "EUR" // default: "CUP"
}

/**
 * Respuesta genérica de éxito
 */
export interface SuccessResponse {
  success?: boolean
  message: string
  id?: string
}

/**
 * Resumen de trabajadores agrupados por cargo
 */
export interface CargosResumen {
  cargo: string
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  salario_fijo: number
  cantidad_personas: number
}

/**
 * Respuesta del endpoint de resumen por cargos
 */
export interface CargosResumenResponse {
  cargos: CargosResumen[]
}
