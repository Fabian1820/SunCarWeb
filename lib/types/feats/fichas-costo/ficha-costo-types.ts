// Tipos para el módulo de Fichas de Costo (vista contable del material).

// Resumen de la ficha activa de un material. En el modelo simplificado actual
// no se generan fichas versionadas, por lo que `ficha_activa` siempre es null,
// pero se conserva el tipo por compatibilidad con consumidores existentes.
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

// Fila del listado: material del catálogo con sus campos contables.
export interface MaterialFichaResumen {
  material_id: string
  producto_id?: string
  codigo?: number
  nombre?: string
  descripcion?: string
  categoria?: string
  marca?: string
  um?: string
  precio?: number
  precio_instaladora?: number
  porciento_rebajable_venta?: number
  costo?: number
  numero_serie?: string | null
  stockaje_minimo?: number | null
  foto?: string
  potenciaKW?: number
  ficha_activa: FichaResumen | null
}

// Payload para edición rápida de precios + costo desde la tabla.
export interface EditarPreciosCostoPayload {
  precio?: number
  precio_instaladora?: number
  porciento_rebajable_venta?: number
  costo?: number
  numero_serie?: string | null
  stockaje_minimo?: number | null
}
