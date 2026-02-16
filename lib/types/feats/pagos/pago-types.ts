export interface PagoCliente {
  id: string
  cliente_numero: string
  cliente_nombre: string
  monto: number
  tipo_pago: 'anticipo' | 'final'
  estado: 'pendiente' | 'completado'
  fecha_creacion: string
  fecha_pago?: string
  metodo_pago?: string
  referencia?: string
  comprobante_url?: string
  moneda?: string
  notas?: string
}

export interface PagoClienteFormData {
  cliente_numero: string
  cliente_nombre: string
  monto: number
  tipo_pago: 'anticipo' | 'final'
  estado: 'pendiente' | 'completado'
  fecha_pago?: string
  metodo_pago?: string
  referencia?: string
  comprobante_url?: string
  moneda?: string
  notas?: string
}
