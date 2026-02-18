import { apiRequest } from '@/lib/api-config'

export interface PagoCreateData {
  oferta_id: string
  monto: number
  fecha: string
  tipo_pago: 'anticipo' | 'pendiente'
  metodo_pago: 'efectivo' | 'transferencia_bancaria' | 'stripe'
  moneda?: 'USD' | 'EUR' | 'CUP'
  tasa_cambio?: number
  pago_cliente?: boolean
  nombre_pagador?: string
  carnet_pagador?: string
  desglose_billetes?: Record<string, number>
  comprobante_transferencia?: string
  recibido_por?: string
  notas?: string
  creado_por?: string
}

export interface Pago {
  id: string
  oferta_id: string
  monto: number
  moneda: 'USD' | 'EUR' | 'CUP'
  tasa_cambio: number
  monto_usd: number
  pago_cliente: boolean
  nombre_pagador: string | null
  carnet_pagador: string | null
  desglose_billetes: Record<string, number> | null
  fecha: string
  tipo_pago: 'anticipo' | 'pendiente'
  metodo_pago: 'efectivo' | 'transferencia_bancaria' | 'stripe'
  comprobante_transferencia?: string
  recibido_por?: string
  notas?: string
  creado_por?: string
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface PagoConDetalles extends Pago {
  oferta: {
    numero_oferta: string
    nombre_oferta: string
    precio_final: number
    monto_pendiente: number
    estado: string
  }
  contacto: {
    nombre: string
    telefono?: string
    carnet?: string
    direccion?: string
    codigo: string
    tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar'
  }
}

export interface PagoCreateResponse {
  success: boolean
  message: string
  pago_id: string
  pago: Pago
  monto_pendiente_actualizado: number
}

export interface PagosResponse {
  success: boolean
  message: string
  data: Pago[]
  total: number
}

export interface PagosConDetallesResponse {
  success: boolean
  message: string
  data: PagoConDetalles[]
  total: number
}

export interface Contacto {
  nombre: string | null
  telefono: string | null
  carnet: string | null
  direccion: string | null
  codigo: string | null
  tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar' | null
}

export interface OfertaConPagos {
  oferta_id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_completo: string
  tipo_oferta: string
  estado: string
  precio_final: number
  monto_pendiente: number
  almacen_id: string
  almacen_nombre: string | null
  pagos: Pago[]
  total_pagado: number
  cantidad_pagos: number
  contacto: Contacto
}

export interface OfertasConPagosResponse {
  success: boolean
  message: string
  data: OfertaConPagos[]
  total: number
}

export class PagoService {
  /**
   * Crear un nuevo pago
   */
  static async crearPago(data: PagoCreateData): Promise<PagoCreateResponse> {
    try {
      const response = await apiRequest<PagoCreateResponse>('/pagos/', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    } catch (error: any) {
      console.error('[PagoService] Error al crear pago:', error)
      throw new Error(error.response?.data?.message || 'Error al crear pago')
    }
  }

  /**
   * Obtener pagos de una oferta
   */
  static async getPagosByOferta(ofertaId: string): Promise<Pago[]> {
    try {
      const response = await apiRequest<PagosResponse>(`/pagos/oferta/${ofertaId}`, {
        method: 'GET',
      })
      return response.data || []
    } catch (error: any) {
      console.error('[PagoService] Error al obtener pagos:', error)
      throw new Error(error.response?.data?.message || 'Error al cargar pagos')
    }
  }

  /**
   * Obtener todos los pagos con detalles completos
   */
  static async getAllPagosConDetalles(filters?: {
    tipo_pago?: 'anticipo' | 'pendiente'
    metodo_pago?: 'efectivo' | 'transferencia_bancaria' | 'stripe'
  }): Promise<PagoConDetalles[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.tipo_pago) params.append('tipo_pago', filters.tipo_pago)
      if (filters?.metodo_pago) params.append('metodo_pago', filters.metodo_pago)
      
      const url = `/pagos/completos/con-detalles${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await apiRequest<PagosConDetallesResponse>(url, {
        method: 'GET',
      })
      return response.data || []
    } catch (error: any) {
      console.error('[PagoService] Error al obtener pagos con detalles:', error)
      throw new Error(error.response?.data?.message || 'Error al cargar pagos')
    }
  }

  /**
   * Actualizar un pago existente
   */
  static async actualizarPago(pagoId: string, data: Partial<PagoCreateData>): Promise<{ success: boolean; message: string; pago_id: string }> {
    try {
      console.log('[PagoService] Actualizando pago:', pagoId, 'con datos:', data)
      const response = await apiRequest<{ success: boolean; message: string; pago_id: string }>(
        `/pagos/${pagoId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      )
      console.log('[PagoService] Respuesta del backend:', response)
      return response
    } catch (error: any) {
      console.error('[PagoService] Error al actualizar pago:', error)
      throw new Error(error.response?.data?.message || 'Error al actualizar pago')
    }
  }

  /**
   * Eliminar un pago
   */
  static async eliminarPago(pagoId: string): Promise<{ success: boolean; monto_pendiente_actualizado: number }> {
    try {
      const response = await apiRequest<{ success: boolean; message: string; monto_pendiente_actualizado: number }>(
        `/pagos/${pagoId}`,
        {
          method: 'DELETE',
        }
      )
      return {
        success: response.success,
        monto_pendiente_actualizado: response.monto_pendiente_actualizado,
      }
    } catch (error: any) {
      console.error('[PagoService] Error al eliminar pago:', error)
      throw new Error(error.response?.data?.message || 'Error al eliminar pago')
    }
  }

  /**
   * Obtener todas las ofertas con pagos
   */
  static async getOfertasConPagos(): Promise<OfertaConPagos[]> {
    try {
      const response = await apiRequest<OfertasConPagosResponse>('/pagos/ofertas-con-pagos', {
        method: 'GET',
      })
      return response.data || []
    } catch (error: any) {
      console.error('[PagoService] Error al obtener ofertas con pagos:', error)
      throw new Error(error.response?.data?.message || 'Error al cargar ofertas con pagos')
    }
  }
}
