// Tipos para el módulo de Fichas de Costo (modelo simplificado)

// Payload para crear ficha: material + precio de costo + porcentaje a subir
export interface FichaCostoCreateData {
  material_id: string
  precio_base: number
  porcentaje: number
}

// Auditoría
export interface AuditoriaEntry {
  tipo: string
  nombre: string
  fecha: string
}

// Ficha completa devuelta por backend
export interface FichaCosto {
  _id?: string
  id?: string
  material_id: string
  material_codigo_snapshot?: string
  material_descripcion_snapshot?: string
  version: number
  estado: string
  vigente_desde: string
  vigente_hasta?: string | null
  // Precio del material en el momento de crear la ficha
  precio_base: number
  // Porcentaje sumado al precio base
  porcentaje: number
  // precio_base * (1 + porcentaje / 100)
  precio_calculado: number
  // precio_venta_calculado de la ficha anterior (null si era la primera)
  precio_anterior_ficha?: number | null
  // MAX(precio_calculado, precio_anterior_ficha) — precio final de venta
  precio_venta_calculado: number
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
  precio_base: number
  porcentaje: number
  precio_calculado: number
  precio_anterior_ficha?: number | null
  precio_venta_calculado: number
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
  [key: string]: unknown
}
