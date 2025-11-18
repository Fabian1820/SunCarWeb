export interface CalculoEnergeticoEquipo {
  nombre: string
  potencia_kw: number
  energia_kwh: number
}

export interface CalculoEnergeticoCategoria {
  id: string
  nombre: string
  equipos: CalculoEnergeticoEquipo[]
}

export interface CategoriasListResponse {
  success: boolean
  message: string
  data: CalculoEnergeticoCategoria[]
}

export interface CategoriaGetResponse {
  success: boolean
  message: string
  data: CalculoEnergeticoCategoria | null
}

export interface EquipoCreateRequest {
  nombre: string
  potencia_kw: number
  energia_kwh: number
  categoria: string
}

export interface EquipoCreateResponse {
  success: boolean
  message: string
  categoria_id: string
}

export interface CategoriaUpdateRequest {
  nombre?: string
}

export interface CategoriaUpdateResponse {
  success: boolean
  message: string
}

export interface CategoriaDeleteResponse {
  success: boolean
  message: string
}

export interface EquipoUpdateRequest {
  nombre?: string
  potencia_kw?: number
  energia_kwh?: number
}

export interface EquipoUpdateResponse {
  success: boolean
  message: string
}

export interface EquipoDeleteResponse {
  success: boolean
  message: string
}
