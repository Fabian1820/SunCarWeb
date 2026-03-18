// Recursos Humanos feature types mirroring backend contracts.

export interface TrabajadorRRHH {
  CI: string
  nombre: string
  activo?: boolean
  cargo: string
  salario_fijo: number
  porcentaje_fijo_estimulo: number
  porcentaje_variable_estimulo: number
  alimentacion: number
  dias_trabajables: number
  dias_no_trabajados: number[]
  is_brigadista?: boolean
  tiene_contraseña?: boolean
  sede_id?: string | null
  departamento_id?: string | null
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
  activo?: boolean
  cargo?: string
  salario_fijo?: number
  porcentaje_fijo_estimulo?: number
  porcentaje_variable_estimulo?: number
  alimentacion?: number
  dias_trabajables?: number
  dias_no_trabajados?: number[]
  is_brigadista?: boolean
  sede_id?: string | null
  departamento_id?: string | null
}

export interface CrearTrabajadorRRHHRequest {
  ci: string
  nombre: string
  activo?: boolean
  cargo?: string
  salario_fijo?: number
  porcentaje_fijo_estimulo?: number
  porcentaje_variable_estimulo?: number
  alimentacion?: number
  dias_trabajables?: number
  is_brigadista?: boolean
  contrasena?: string
  sede_id?: string | null
  departamento_id?: string | null
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
  cantidad_personas: number
  total_porcentaje_fijo_estimulo: number
  total_porcentaje_variable_estimulo: number
  total_salario_fijo: number
}

export interface CargosResumenResponse {
  cargos: CargosResumen[]
}
