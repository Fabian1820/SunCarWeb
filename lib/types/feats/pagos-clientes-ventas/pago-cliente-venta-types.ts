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
  comercial?: string | null;
  materiales?: string[] | string | null;
  monto?: number;
  moneda?: "USD" | "CUP" | "EUR" | string;
  monto_pendiente_despues_pago?: number | null;
  monto_devuelto_usd?: number | null;
  tasa_cambio?: number | null;
  monto_usd?: number | null;
  descuento_porcentaje?: number | null;
  metodo_pago?: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion" | "zelle" | string;
  es_a_plazos?: boolean;
  plan_pagos?: PagoProgramado[] | null;
  pagos_programados?: PagoProgramado[] | null;
  recibido_por?: string | null;
  notas?: string | null;
  desglose_billetes?: Record<string, number> | null;
  cambio?: number | null;
  cambio_real_monto?: number | null;
  cambio_real_moneda?: "USD" | "CUP" | "EUR" | null;
  cambio_real_tasa?: number | null;
  fecha?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
}

export interface DevolucionPagoVentaCreateData {
  pago_venta_id: string;
  monto_devuelto: number;
  fecha: string;
  registrado_por?: string;
  motivo_devolucion: string;
  desglose_billetes?: Record<string, number>;
}

export interface DevolucionPagoVenta {
  id: string;
  pago_venta_id: string;
  solicitud_venta_id: string;
  monto_devuelto: number;
  monto_devuelto_usd?: number | null;
  fecha: string;
  registrado_por: string;
  motivo_devolucion: string;
  desglose_billetes?: Record<string, number> | null;
  fecha_creacion?: string;
}

export interface PagoVentaCreateData {
  solicitud_venta_id: string;
  monto: number;
  moneda: "USD" | "CUP" | "EUR";
  tasa_cambio?: number;
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion" | "zelle";
  stripe_link?: string;
  desglose_billetes?: Record<string, number>;
  cambio?: number;
  cambio_real_monto?: number;
  cambio_real_moneda?: "USD" | "CUP" | "EUR";
  cambio_real_tasa?: number;
  monto_comision?: number;
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
  /** Total bruto antes de descuento y antes de aumento. */
  total_sin_descuento?: number;
  /** Igual a `total_a_pagar` ya corregido por descuento/aumento. */
  total_con_aumento?: number;
  /** Monto en USD del aumento aplicado (0 si no hay aumento). */
  aumento_monto?: number;
  descuento?: number;
  pagos?: Array<{
    id?: string;
    monto?: number;
    moneda?: string;
    monto_usd?: number;
    tasa_cambio?: number;
    metodo_pago?: string;
    recibido_por?: string;
    notas?: string;
    desglose_billetes?: Record<string, number> | null;
    cambio?: number | null;
    cambio_real_monto?: number | null;
    cambio_real_moneda?: string | null;
    cambio_real_tasa?: number | null;
    descuento_porcentaje?: number | null;
    monto_pendiente_despues_pago?: number | null;
    fecha?: string;
  }>;
  total_pagado?: number;
  total_devuelto?: number;
  monto_pendiente?: number;
  cliente?: string;
  cliente_nombre?: string;
  cliente_numero?: string;
  comercial?: string | null;
  fecha_emision?: string;
  emitida_por: string;
  emitida_por_nombre?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string | null;
  anulada?: boolean;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
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
  tasa_cambio?: number;
  metodo_pago?: string;
  recibido_por?: string;
  notas?: string;
  desglose_billetes?: Record<string, number> | null;
  descuento_porcentaje?: number | null;
  monto_pendiente_despues_pago?: number | null;
}

export interface FacturaVentaResumen {
  numero_factura?: string;
  fecha?: string;
  cliente?: string;
  comercial?: string | null;
  emitida_por?: string;
  emitida_por_nombre?: string | null;
  solicitudes_vinculadas?: FacturaVentaResumenSolicitud[];
  pagos?: FacturaVentaResumenPago[];
  total_precio_materiales?: number;
  total_descuento_monto?: number;
  total_a_pagar?: number;
  total_pagado?: number;
  total_devuelto?: number;
  monto_pendiente?: number;
  anulada?: boolean;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
}

// Alias de compatibilidad — retirar cuando todos los usos migren a PagoVenta
export type PagoClienteVenta = PagoVenta;
export type PagoClienteVentaCreateData = PagoVentaCreateData;

export interface PagoVentaListParams {
  skip?: number;
  limit?: number;
  q?: string;
  metodo_pago?: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion" | "zelle" | string;
  moneda?: "USD" | "CUP" | "EUR" | string;
  comercial?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  factura_venta_id?: string;
  solicitud_venta_id?: string;
  cliente_venta_id?: string;
}

export interface FacturaVentaListParams {
  skip?: number;
  limit?: number;
  q?: string;
  estado?: "pagada" | "pendiente" | "parcial" | string;
  moneda?: "USD" | "CUP" | "EUR" | string;
  comercial?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  /**
   * Filtra facturas por método de pago de cualquiera de sus pagos.
   * Si el backend no soporta el param, el frontend filtra client-side
   * sobre la página cargada.
   */
  metodo_pago?: "efectivo" | "transferencia_bancaria" | "stripe" | "financiacion" | "zelle" | string;
}

export interface PagoVentaAgregados {
  /** Total por moneda sobre todo el set filtrado (no solo la página). */
  por_moneda: Record<string, { monto: number }>;
  /** Total pendiente en USD sobre el set filtrado, deduplicado por solicitud. */
  pendiente_usd: number;
}

export interface FacturaVentaAgregados {
  facturado_sin_descuento_usd: number;
  facturado_usd: number;
  descuento_usd: number;
  aumento_monto_usd: number;
  cobrado_usd: number;
  cobrado_por_moneda: Record<string, number>;
  pendiente_usd: number;
}

export interface PagoVentaListResponse {
  data: PagoVenta[];
  total: number;
  agregados?: PagoVentaAgregados;
}

export interface FacturaVentaListResponse {
  data: FacturaClienteVenta[];
  total: number;
  agregados?: FacturaVentaAgregados;
}
