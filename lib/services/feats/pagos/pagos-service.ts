import { apiRequest } from '@/lib/api-config'

export interface OfertaConfirmadaSinPago {
  id: string
  numero_oferta: string
  nombre_automatico: string
  nombre_oferta: string
  nombre_completo: string
  tipo_oferta: string
  estado: string
  
  // Información del contacto
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
    estado?: string
    direccion?: string
    provincia_montaje?: string
    municipio?: string
  }
  nombre_lead_sin_agregar?: string
  
  // Almacén
  almacen_id: string
  almacen_nombre: string
  foto_portada?: string
  
  // Items y materiales
  items: Array<{
    material_codigo: string
    descripcion: string
    precio: number
    precio_original?: number
    precio_editado?: boolean
    cantidad: number
    categoria?: string
    seccion?: string
    margen_asignado?: number
  }>
  secciones_personalizadas?: any[]
  elementos_personalizados?: any[]
  componentes_principales?: {
    inversor?: any
    bateria?: any
    panel?: any
  }
  
  // Cálculos financieros
  margen_comercial?: number
  porcentaje_margen_materiales?: number
  porcentaje_margen_instalacion?: number
  margen_total?: number
  margen_materiales?: number
  margen_instalacion?: number
  costo_transportacion?: number
  total_materiales: number
  subtotal_con_margen?: number
  descuento_porcentaje?: number
  monto_descuento?: number
  subtotal_con_descuento?: number
  total_elementos_personalizados?: number
  total_costos_extras?: number
  precio_final: number
  
  // Pagos
  pagos: string[]
  monto_pendiente: number
  
  // Contribución y forma de pago
  aplica_contribucion?: boolean
  porcentaje_contribucion?: number
  monto_contribucion?: number
  moneda_pago?: string
  tasa_cambio?: number
  pago_transferencia?: boolean
  datos_cuenta?: any
  monto_convertido?: number
  
  // Reserva de materiales
  materiales_reservados?: boolean
  reserva_id?: string
  tipo_reserva?: string
  fecha_reserva?: string
  fecha_expiracion?: string
  fecha_cancelacion?: string
  motivo_cancelacion?: string
  
  // Stock disponible
  stock_disponible?: Array<{
    material_codigo: string
    stock_actual: number
    cantidad_en_oferta: number
    suficiente: boolean
  }>
  
  // Días restantes
  dias_restantes?: number
  
  // Auditoría
  notas?: string
  creado_por?: string
  fecha_creacion: string
  fecha_actualizacion?: string
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
