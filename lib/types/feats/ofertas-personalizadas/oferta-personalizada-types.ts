// Tipos para el módulo de Ofertas Personalizadas

/**
 * Item de Inversor en una oferta personalizada
 */
export interface InversorItem {
  cantidad?: number
  potencia?: number
  marca?: string
  descripcion?: string
  codigo_equipo?: string
}

/**
 * Item de Batería en una oferta personalizada
 */
export interface BateriaItem {
  cantidad?: number
  potencia?: number
  marca?: string
  descripcion?: string
}

/**
 * Item de Panel en una oferta personalizada
 */
export interface PanelItem {
  cantidad?: number
  potencia?: number
  marca?: string
  descripcion?: string
}

/**
 * Item de Útil en una oferta personalizada
 */
export interface UtilItem {
  cantidad?: number
  descripcion?: string
}

/**
 * Item de Servicio en una oferta personalizada
 * Nota: El costo se define aquí porque varía por oferta
 */
export interface ServicioOfertaItem {
  descripcion?: string
  costo?: number
}

/**
 * Entidad principal: Oferta Personalizada
 */
export interface OfertaPersonalizada {
  id?: string
  cliente_id?: string
  lead_id?: string
  inversores?: InversorItem[]
  baterias?: BateriaItem[]
  paneles?: PanelItem[]
  utiles?: UtilItem[]
  servicios?: ServicioOfertaItem[]
  precio?: number
  pagada: boolean
}

/**
 * Request para crear una oferta personalizada
 * Todos los campos son opcionales según requerimiento del negocio
 */
export interface OfertaPersonalizadaCreateRequest {
  cliente_id?: string
  lead_id?: string
  inversores?: InversorItem[]
  baterias?: BateriaItem[]
  paneles?: PanelItem[]
  utiles?: UtilItem[]
  servicios?: ServicioOfertaItem[]
  precio?: number
  pagada?: boolean
}

/**
 * Request para actualizar una oferta personalizada
 * Todos los campos son opcionales (actualización parcial)
 */
export interface OfertaPersonalizadaUpdateRequest {
  cliente_id?: string
  lead_id?: string
  inversores?: InversorItem[]
  baterias?: BateriaItem[]
  paneles?: PanelItem[]
  utiles?: UtilItem[]
  servicios?: ServicioOfertaItem[]
  precio?: number
  pagada?: boolean
}

/**
 * Response del endpoint de total gastado
 */
export interface TotalGastadoResponse {
  success: boolean
  message: string
  cliente_id: string
  total_gastado: number
  moneda: string
}
