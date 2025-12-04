// Artículos Tienda feature types shared across backend responses and frontend usage.

export interface ArticuloTienda {
  id?: string
  articulo_id?: string
  categoria: string
  modelo: string
  descripcion_uso?: string
  foto?: string
  unidad: "pieza" | "set"
  precio: number
  precio_por_cantidad?: Record<string, number> // Ejemplo: {"10": 950.0, "50": 900.0, "100": 850.0}
  especificaciones?: Record<string, any>
}

export interface ArticuloTiendaFormData {
  categoria: string
  modelo: string
  descripcion_uso?: string
  foto?: string
  unidad: "pieza" | "set"
  precio: number | string
  precio_por_cantidad?: Record<string, number>
  especificaciones?: Record<string, any>
}

export interface ArticuloTiendaCreateData {
  categoria: string
  modelo: string
  descripcion_uso?: string
  foto?: File | null | string // Puede ser File para subir, o string para URL existente
  unidad: "pieza" | "set"
  precio: number
  precio_por_cantidad?: Record<string, number>
  especificaciones?: Record<string, any>
}

export interface ArticuloTiendaUpdateData {
  categoria?: string
  modelo?: string
  descripcion_uso?: string
  foto?: File | null | string // Puede ser File para subir, o string para URL existente
  unidad?: "pieza" | "set"
  precio?: number
  precio_por_cantidad?: Record<string, number>
  especificaciones?: Record<string, any>
}

export interface ArticuloTiendaFilters {
  searchTerm: string
  selectedCategory: string
  selectedUnidad: string
}

export interface BackendArticuloTiendaResponse {
  data?: ArticuloTienda | ArticuloTienda[]
  success?: boolean
  message?: string
}

// Atributos sugeridos para especificaciones (referencia)
export interface EspecificacionesSugeridas {
  capacidad?: string
  voltaje?: string
  ac_voltaje?: string
  dc_voltaje_entrada?: string
  peso_neto?: string
  peso_bruto?: string
  tamano_embalaje?: string
  energia?: string
  max_piezas_paralelo?: string
  ciclos_vida?: string
  tamano_producto?: string
  garantia?: string
  comunicacion?: string
  minima_cantidad_apilada?: string
  energia_modulo?: string
  con_bateria?: boolean
  voltaje_puesta_marcha?: string
  maxima_carga_actual?: string
  voltaje_maximo_entrada_solar?: string
  numero_maximo_rutas_entrada?: string
  voltaje_nominal_rama?: string
  corriente_nominal_rama?: string
  [key: string]: any // Permite campos adicionales
}

