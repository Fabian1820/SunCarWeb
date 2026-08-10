export type TipoReferencia = "sucursal" | "trabajador" | "cliente"

export interface Fuente {
  id: string
  nombre: string
  requiere_referencia: boolean
  tipo_referencia: TipoReferencia | null
  activo: boolean
  orden: number
}

export interface FuenteCreateData {
  nombre: string
  requiere_referencia: boolean
  tipo_referencia: TipoReferencia | null
  activo: boolean
  orden: number
}

export interface FuenteUpdateData {
  nombre?: string
  requiere_referencia?: boolean
  tipo_referencia?: TipoReferencia | null
  activo?: boolean
  orden?: number
}

export interface TrabajadorOpcion {
  id: string
  nombre: string
}
