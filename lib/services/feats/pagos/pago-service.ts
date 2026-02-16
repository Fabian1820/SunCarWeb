import { apiRequest } from '@/lib/api-config'

export interface PagoCreateData {
  oferta_id: string
  monto: number
  fecha: string
  tipo_pago: 'anticipo' | 'pendiente'
  metodo_pago: 'efectivo' | 'transferencia_bancaria' | 'stripe'
  comprobante_transferencia?: string
  recibido_por?: string
  notas?: string
  creado_por?: string
}

export interface Pago {
  id: string
  oferta_id: string
  monto: number
  fecha: string
  tipo_pago: 'anticipo' | 'pendiente'
  metodo_pago: 'efectivo' | 'transferencia_bancaria' | 'stripe'
  comprobante_transferencia?: string
  recibido_por?: string
  notas?: string
  creado_por?: string
  fecha_creacion: string
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
}
