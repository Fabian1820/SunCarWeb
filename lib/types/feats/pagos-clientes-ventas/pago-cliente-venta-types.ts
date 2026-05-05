export interface PagoProgramado {
  fecha: string;
  monto: number;
  nota?: string | null;
}

export interface PagoVenta {
  id: string;
  solicitud_venta_id: string;
  monto: number;
  moneda: "USD" | "CUP" | "EUR";
  tasa_cambio?: number | null;
  monto_usd?: number | null;
  descuento_porcentaje?: number | null;
  metodo_pago: "efectivo" | "transferencia_bancaria";
  recibido_por?: string | null;
  notas?: string | null;
  es_a_plazos: boolean;
  pagos_programados?: PagoProgramado[] | null;
  fecha: string;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export interface PagoVentaCreateData {
  solicitud_venta_id: string;
  monto: number;
  moneda: "USD" | "CUP" | "EUR";
  tasa_cambio?: number;
  descuento_porcentaje?: number;
  metodo_pago: "efectivo" | "transferencia_bancaria";
  recibido_por: string;
  notas?: string;
  es_a_plazos: boolean;
  pagos_programados?: PagoProgramado[];
  fecha: string;
}

export interface FacturaClienteVenta {
  id: string;
  numero_factura: string;
  solicitud_venta_id: string;
  cliente_nombre?: string;
  cliente_numero?: string;
  fecha_emision: string;
  emitida_por: string;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export interface FacturaClienteVentaCreateData {
  numero_factura: string;
  solicitud_venta_id: string;
  fecha_emision: string;
  emitida_por: string;
}

// Alias de compatibilidad — retirar cuando todos los usos migren a PagoVenta
export type PagoClienteVenta = PagoVenta;
export type PagoClienteVentaCreateData = PagoVentaCreateData;
