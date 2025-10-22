// Lead feature types aligned with backend payloads (2024-11 revision).

export interface ElementoPersonalizado {
  descripcion: string
  cantidad: number
}

export interface OfertaEmbebida {
  id?: string
  descripcion: string
  descripcion_detallada?: string
  precio: number
  precio_cliente?: number
  marca?: string
  imagen?: string
  moneda?: string
  financiamiento?: boolean
  descuentos?: string
  garantias?: string[]
  elementos?: unknown[]
  cantidad: number
}

export interface Lead {
  id?: string
  fecha_contacto: string
  nombre: string
  telefono: string
  telefono_adicional?: string
  estado: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  comentario?: string
  provincia_montaje?: string
  comercial?: string
  ofertas?: OfertaEmbebida[]
  elementos_personalizados?: ElementoPersonalizado[]
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export interface LeadResponse {
  success: boolean
  message: string
  data: Lead | Lead[] | null
}

export interface LeadCreateData {
  fecha_contacto: string
  nombre: string
  telefono: string
  estado: string
  telefono_adicional?: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  comentario?: string
  provincia_montaje?: string
  comercial?: string
  ofertas?: OfertaEmbebida[]
  elementos_personalizados?: ElementoPersonalizado[]
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export interface LeadUpdateData {
  fecha_contacto?: string
  nombre?: string
  telefono?: string
  telefono_adicional?: string
  estado?: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  comentario?: string
  provincia_montaje?: string
  comercial?: string
  ofertas?: OfertaEmbebida[]
  elementos_personalizados?: ElementoPersonalizado[]
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export interface LeadConversionRequest {
  numero: string
  fecha_montaje?: string
  latitud?: string | number
  longitud?: string | number
  carnet_identidad?: string
  fecha_instalacion?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}
