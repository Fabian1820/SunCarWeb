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
