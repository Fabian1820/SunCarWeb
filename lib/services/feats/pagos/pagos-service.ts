import { apiRequest } from '@/lib/api-config'

export interface OfertaConfirmadaSinPago {
  id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_oferta: string
  nombre_completo: string
  estado: string
  
  // Información del contacto (simplificado)
  cliente_numero?: string
  cliente?: {
    numero: string
    nombre: string
    telefono?: string
    direccion?: string
    carnet_identidad?: string
  }
  lead_id?: string
  lead?: {
    id: string
    nombre: string
    telefono?: string
    direccion?: string
  }
  nombre_lead_sin_agregar?: string
  
  // Almacén
  almacen_id: string
  almacen_nombre: string
  foto_portada?: string
  
  // Cálculos financieros (simplificado)
  precio_final: number
  monto_pendiente: number
  
  // Pagos
  pagos: string[]
  
  // Auditoría (simplificado)
  notas?: string
  creado_por?: string
  fecha_creacion: string
}

export interface PagosResponse {
  data: OfertaConfirmadaSinPago[]
  total: number
  page: number
  limit: number
}

export class PagosService {
  /**
   * Obtiene ofertas confirmadas sin pago (anticipos pendientes)
   */
  static async getOfertasConfirmadasSinPago(): Promise<OfertaConfirmadaSinPago[]> {
    try {
      const response = await apiRequest<PagosResponse>('/ofertas-personalizadas/confirmadas-sin-pago', {
        method: 'GET',
      })
      return response.data || []
    } catch (error: any) {
      console.error('[PagosService] Error al obtener ofertas confirmadas sin pago:', error)
      throw new Error(error.response?.data?.message || 'Error al cargar ofertas confirmadas sin pago')
    }
  }

  /**
   * Obtiene ofertas confirmadas con saldo pendiente (pagos finales pendientes)
   */
  static async getOfertasConfirmadasConSaldoPendiente(): Promise<OfertaConfirmadaSinPago[]> {
    try {
      const response = await apiRequest<PagosResponse>('/ofertas/confeccion/personalizadas/confirmadas-con-saldo-pendiente', {
        method: 'GET',
      })
      return response.data || []
    } catch (error: any) {
      console.error('[PagosService] Error al obtener ofertas con saldo pendiente:', error)
      throw new Error(error.response?.data?.message || 'Error al cargar ofertas con saldo pendiente')
    }
  }
}
