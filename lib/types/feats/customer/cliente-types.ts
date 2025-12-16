import type { ElementoPersonalizado, OfertaEmbebida, OfertaAsignacion } from '../leads/lead-types'

export interface Cliente {
  id?: string  // ID de MongoDB (transformado desde _id por el backend)
  numero: string
  nombre: string
  direccion: string
  telefono?: string
  telefono_adicional?: string
  fecha_contacto?: string
  estado?: string
  fuente?: string
  referencia?: string
  pais_contacto?: string
  comentario?: string
  provincia_montaje?: string
  comercial?: string
  ofertas?: OfertaEmbebida[]
  elementos_personalizados?: ElementoPersonalizado[]
  latitud?: number | string
  longitud?: number | string
  carnet_identidad?: string
  fecha_instalacion?: string
  fecha_montaje?: string
  created_at?: string
  updated_at?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export interface ClienteResponse {
  success: boolean
  message: string
  data: Cliente | Cliente[] | null
}

export interface ClienteCreateData {
  numero: string
  nombre: string
  direccion: string
  telefono?: string
  telefono_adicional?: string
  fecha_contacto?: string
  estado?: string
  fuente?: string
  referencia?: string
  pais_contacto?: string
  comentario?: string
  provincia_montaje?: string
  comercial?: string
  ofertas?: OfertaAsignacion[]  // Al crear: solo enviar oferta_id + cantidad
  elementos_personalizados?: ElementoPersonalizado[]
  latitud?: number | string
  longitud?: number | string
  carnet_identidad?: string
  fecha_instalacion?: string
  fecha_montaje?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export interface ClienteSimpleCreateData {
  numero: string
  nombre: string
  direccion: string
  telefono?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
}

export type ClienteUpdateData = Partial<ClienteCreateData>
