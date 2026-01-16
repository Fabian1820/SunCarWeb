import { apiRequest } from '@/lib/api-config'

// Tipos para el endpoint de pendientes de instalación
export interface OfertaInstalacion {
  inversor_codigo: string | null
  inversor_cantidad: number
  inversor_nombre: string | null
  bateria_codigo: string | null
  bateria_cantidad: number
  bateria_nombre: string | null
  panel_codigo: string | null
  panel_cantidad: number
  panel_nombre: string | null
  costo_oferta: number
  costo_extra: number
  costo_transporte: number
  aprobada: boolean
  pagada: boolean
  elementos_personalizados: string | null
  razon_costo_extra: string | null
}

export interface LeadPendienteInstalacion {
  id: string
  fecha_contacto: string
  nombre: string
  telefono: string
  telefono_adicional: string | null
  estado: string
  fuente: string | null
  referencia: string | null
  direccion: string | null
  pais_contacto: string | null
  comentario: string | null
  provincia_montaje: string | null
  municipio: string | null
  comercial: string | null
  ofertas: OfertaInstalacion[]
  comprobante_pago_url: string | null
  metodo_pago: string | null
  moneda: string | null
}

export interface ClientePendienteInstalacion {
  id: string
  numero: string
  nombre: string
  telefono: string | null
  telefono_adicional: string | null
  direccion: string
  fecha_contacto: string | null
  estado: string | null
  falta_instalacion: string | null
  fuente: string | null
  referencia: string | null
  pais_contacto: string | null
  comentario: string | null
  provincia_montaje: string | null
  municipio: string | null
  comercial: string | null
  ofertas: OfertaInstalacion[]
  latitud: string | null
  longitud: string | null
  carnet_identidad: string | null
  fecha_instalacion: string | null
  fecha_montaje: string | null
  comprobante_pago_url: string | null
  metodo_pago: string | null
  moneda: string | null
}

export interface PendientesInstalacionResponse {
  leads: LeadPendienteInstalacion[]
  clientes: ClientePendienteInstalacion[]
  total_leads: number
  total_clientes: number
  total_general: number
}

export const InstalacionesService = {
  /**
   * Obtiene todos los leads y clientes con estado "Pendiente de Instalación"
   */
  async getPendientesInstalacion(): Promise<PendientesInstalacionResponse> {
    return apiRequest<PendientesInstalacionResponse>('/pendientes-instalacion/', {
      method: 'GET',
    })
  },
}
