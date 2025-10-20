// Recursos Humanos feature types mirroring backend contracts.

export interface TrabajadorRRHH {
  CI: string
  nombre: string
  cargo: string
  salario_fijo: number
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  alimentacion: number
  dias_trabajables: number
  dias_no_trabajados: number[]
  is_brigadista?: boolean
  tiene_contraseña?: boolean
}

export interface IngresoMensual {
  id: string
  mes: number
  anio: number
  monto: number
  moneda: 'CUP' | 'USD' | 'EUR'
}

export interface RecursosHumanosResponse {
  trabajadores: TrabajadorRRHH[]
  ultimo_ingreso_mensual: IngresoMensual | null
}

export interface ActualizarTrabajadorRRHHRequest {
  cargo?: string
  salario_fijo?: number
  porcentaje_fijo_estimulo?: number
  porcentaje_variable_estimulo?: number
  alimentacion?: number
  dias_trabajables?: number
  dias_no_trabajados?: number[]
}

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

export interface IngresoMensualRequest {
  mes: number
  anio: number
  monto: number
  moneda?: 'CUP' | 'USD' | 'EUR'
}

export interface SuccessResponse {
  success?: boolean
  message: string
  id?: string
}

export interface CargosResumen {
  cargo: string
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  salario_fijo: number
  cantidad_personas: number
}

export interface CargosResumenResponse {
  cargos: CargosResumen[]
}
