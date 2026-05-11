export interface PagoProgramado {
  fecha: string;
  monto: number;
  nota?: string | null;
}

export interface PagoVenta {
  id: string;
  solicitud_venta_id?: string;
  solicitud_codigo?: string | null;
  factura_numero?: string | null;
  cliente_nombre?: string | null;
  materiales?: string[] | string | null;
  monto?: number;
  moneda?: "USD" | "CUP" | "EUR" | string;
  monto_pendiente_despues_pago?: number | null;
  tasa_cambio?: number | null;
  monto_usd?: number | null;
  descuento_porcentaje?: number | null;
  metodo_pago?: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion" | string;
  es_a_plazos?: boolean;
  plan_pagos?: PagoProgramado[] | null;
  pagos_programados?: PagoProgramado[] | null;
  recibido_por?: string | null;
  notas?: string | null;
  fecha?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface PagoVentaCreateData {
  solicitud_venta_id: string;
  monto: number;
  moneda: "USD" | "CUP" | "EUR";
  tasa_cambio?: number;
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion";
  stripe_link?: string;
  desglose_billetes?: Record<string, number>;
  cambio?: number;
  recibido_por: string;
  notas?: string;
  /** Si true, persiste plan_pagos en la solicitud */
  es_a_plazos?: boolean;
  /** Plan de cuotas — se persiste en la SolicitudVenta */
  plan_pagos?: PagoProgramado[];
  fecha: string;
}

export interface FacturaClienteVenta {
  id?: string;
  factura_id?: string;
  numero_factura: string;
  solicitud_venta_id?: string;
  codigos_solicitudes?: string[];
  solicitudes?: Array<{ solicitud_venta_id?: string; codigo?: string }>;
  materiales?:
    | Array<{
        material_id?: string;
        material_codigo?: string;
        material_descripcion?: string;
        descripcion?: string;
        nombre?: string;
        cantidad?: number;
        precio?: number;
        subtotal?: number;
      }>
    | string[]
    | string
    | null;
  total_a_pagar?: number;
  descuento?: number;
  pagos?: Array<{
    id?: string;
    monto?: number;
    moneda?: string;
    monto_usd?: number;
    fecha?: string;
  }>;
  total_pagado?: number;
  monto_pendiente?: number;
  cliente?: string;
  cliente_nombre?: string;
  cliente_numero?: string;
  fecha_emision?: string;
  emitida_por: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface FacturaClienteVentaCreateData {
  // Requerido por el backend (422 si falta)
  numero: string;
  fecha: string;
  cliente_venta_id: string;
  solicitudes: Array<{ solicitud_venta_id: string }>;
  // Campos opcionales / legacy para compatibilidad
  numero_factura?: string;
  solicitud_venta_id?: string;
  fecha_emision?: string;
  emitida_por?: string;
}

export interface FacturaVentaResumenSolicitud {
  codigo_solicitud?: string;
  materiales?: Array<{
    material_descripcion?: string;
    descripcion?: string;
    nombre?: string;
    cantidad?: number;
    precio?: number;
    subtotal?: number;
    precio_con_descuento?: number;
    descuento_porcentaje?: number;
    descuento_monto?: number;
  }> | string[];
  precio_materiales?: number;       // precio bruto (sin descuento)
  descuento_porcentaje?: number;    // opcional
  descuento_monto?: number;         // monto $ descontado en esta solicitud
  monto_a_pagar?: number;
}

export interface FacturaVentaResumenPago {
  id?: string;
  fecha?: string;
  monto?: number;
  moneda?: string;
  monto_usd?: number;
}

export interface FacturaVentaResumen {
  numero_factura?: string;
  fecha?: string;
  cliente?: string;
  emitida_por?: string;
  solicitudes_vinculadas?: FacturaVentaResumenSolicitud[];
  pagos?: FacturaVentaResumenPago[];
  total_precio_materiales?: number;
  total_descuento_monto?: number;
  total_a_pagar?: number;
  total_pagado?: number;
  monto_pendiente?: number;
}

// Alias de compatibilidad — retirar cuando todos los usos migren a PagoVenta
export type PagoClienteVenta = PagoVenta;
export type PagoClienteVentaCreateData = PagoVentaCreateData;
