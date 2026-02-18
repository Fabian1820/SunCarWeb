import { apiRequest } from '@/lib/api-config'

export interface OfertaConfirmadaSinPago {
  id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_oferta: string
  nombre_completo: string
  tipo_oferta: string
  
  // Información del contacto (simplificado desde el backend)
  cliente_numero?: string | null
  lead_id?: string | null
  nombre_lead_sin_agregar?: string | null
  
  // Almacén
  almacen_id: string
  almacen_nombre: string
  
  // Cálculos financieros
  margen_comercial: number
  porcentaje_margen_materiales: number
  porcentaje_margen_instalacion: number
  margen_total: number
  margen_materiales: number
  margen_instalacion: number
  costo_transportacion: number
  total_materiales: number
  subtotal_con_margen: number
  descuento_porcentaje: number
  monto_descuento: number
  subtotal_con_descuento: number
  total_elementos_personalizados: number
  total_costos_extras: number
  precio_final: number
  
  // Información de pago
  aplica_contribucion: boolean
  porcentaje_contribucion: number
  monto_contribucion: number | null
  moneda_pago: string
  tasa_cambio: number | null
  pago_transferencia: boolean
  datos_cuenta: string | null
  monto_convertido: number | null
  
  // Pagos
  pagos: string[]
  monto_pendiente: number
  
  // Auditoría
  notas?: string | null
  creado_por?: string | null
  fecha_creacion: string
  
  // Contacto simplificado (nuevo formato del backend)
  contacto: {
    nombre: string | null
    telefono: string | null
    carnet: string | null
    direccion: string | null
    codigo: string | null
    tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar' | null
  }
  
  // Campos legacy para compatibilidad (deprecated)
  cliente?: {
    numero: string
    nombre: string
    telefono?: string
    direccion?: string
    carnet_identidad?: string
  }
  lead?: {
    id: string
    nombre: string
    telefono?: string
    direccion?: string
  }
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
