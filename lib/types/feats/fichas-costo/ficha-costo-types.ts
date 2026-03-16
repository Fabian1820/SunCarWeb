// Tipos para el módulo de Fichas de Costo

export type ModoDistribucion = 'unidad' | 'lote' | 'contenedor'

export interface CostoDetalle {
  modo: ModoDistribucion
  precio_total: number
  cantidad_base: number
}

export interface OtroCosto {
  tipo_costo: string
  detalle: CostoDetalle
}

// Payload para crear ficha
export interface FichaCostoCreateData {
  material_id: string
  costo_unitario: number
  costo_transportacion: CostoDetalle
  costo_envio: CostoDetalle
  otros_costos: OtroCosto[]
  porcentaje_ganancia: number
}

// Auditoría
export interface AuditoriaEntry {
  accion: string
  usuario?: string
  fecha: string
  detalle?: string
}

// Ficha completa devuelta por backend
export interface FichaCosto {
  _id?: string
  id?: string
  material_id: string
  version: number
  estado: string
  vigente_desde: string
  vigente_hasta?: string | null
  costo_unitario: number
  costo_transportacion: CostoDetalle
  costo_envio: CostoDetalle
  otros_costos: OtroCosto[]
  porcentaje_ganancia: number
  costo_real_unitario: number
  ganancia_unitaria: number
  precio_venta_calculado: number
  costo_unitario_calculado?: number
  auditoria: AuditoriaEntry[]
  fecha_creacion?: string
  fecha_actualizacion?: string
}

// Respuesta de comparar precio
export interface ComparacionPrecio {
  precio_actual_material: number
  precio_calculado_ficha: number
  diferencia_absoluta: number
  diferencia_porcentual: number
  requiere_actualizacion: boolean
}

// Respuesta de aplicar precio
export interface AplicarPrecioResponse {
  precio_anterior: number
  precio_nuevo: number
}

// Resumen de ficha en el listado global
export interface FichaResumen {
  id: string
  version: number
  precio_venta_calculado: number
  costo_real_unitario: number
  porcentaje_ganancia: number
  vigente_desde: string
}

// Fila del listado global: material + su ficha activa (o null)
export interface MaterialFichaResumen {
  material_id: string
  codigo?: number
  nombre?: string
  descripcion?: string
  categoria?: string
  marca?: string
  precio?: number
  foto?: string
  potenciaKW?: number
  ficha_activa: FichaResumen | null
}

// Material del catálogo web (para selector)
export interface MaterialCatalogoWeb {
  _id?: string
  id?: string
  material_id?: string
  codigo?: number
  nombre?: string
  descripcion?: string
  marca?: string
  precio?: number
  categoria?: string
  potenciaKW?: number
  foto?: string
  imagen?: string
  imagen_url?: string
  foto_url?: string
  fotos?: string[]
  unidad?: string
  [key: string]: any
}
