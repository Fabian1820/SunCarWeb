// Oferta feature types for backend requests and responses.

export interface ElementoOferta {
  categoria?: string | null
  descripcion: string
  cantidad: number
  foto?: string | null
}

export interface CreateElementoRequest {
  categoria?: string
  descripcion: string
  cantidad: number
  foto?: File | null
}

export interface UpdateElementoRequest {
  categoria?: string
  descripcion?: string
  cantidad?: number
  foto?: File | null
}

export interface Oferta {
  id: string
  descripcion: string
  descripcion_detallada?: string | null
  precio: number
  precio_cliente?: number | null
  marca?: string | null
  imagen?: string | null
  pdf?: string | null
  moneda?: string | null
  financiamiento?: boolean
  descuentos?: string | null
  garantias: string[]
  elementos: ElementoOferta[]
}

export interface OfertaSimplificada {
  id: string
  descripcion: string
  descripcion_detallada?: string | null
  precio: number
  precio_cliente?: number | null
  marca?: string | null
  imagen?: string | null
  pdf?: string | null
  moneda?: string | null
  financiamiento?: boolean
  descuentos?: string | null
}

export interface CreateOfertaRequest {
  descripcion: string
  precio: number
  descripcion_detallada?: string | null
  precio_cliente?: number | null
  marca?: string | null
  moneda?: string | null
  financiamiento?: boolean
  descuentos?: string | null
  imagen?: File | null
  pdf?: File | null
  garantias: string[]
}

export type UpdateOfertaRequest = Partial<CreateOfertaRequest>
