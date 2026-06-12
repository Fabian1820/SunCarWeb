import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "../clientes-ventas/cliente-venta-types";
import type { PagoProgramado } from "../pagos-clientes-ventas/pago-cliente-venta-types";

export interface SolicitudVentaMaterialItem {
  material_id: string;
  cantidad: number;
  precio?: number;
  descuento_porcentaje?: number;
  aumento_porcentaje?: number;
}

export interface MaterialVentaInfo {
  id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  habilitar_venta_web?: boolean;
  categoria?: string;
}

export interface SolicitudVentaMaterialItemDetalle {
  material_id: string;
  cantidad: number;
  /** Precio unitario del material en la solicitud */
  precio?: number;
  descuento_porcentaje?: number;
  aumento_porcentaje?: number;
  precio_con_descuento?: number;
  /** precio_con_descuento × cantidad calculado por el backend */
  subtotal?: number;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  codigo?: string;
  descripcion?: string;
  material?: MaterialVentaInfo;
}

export interface SolicitudVentaAlmacenInfo {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  responsable?: string;
}

export interface SolicitudVentaTrabajadorInfo {
  id: string;
  ci?: string;
  nombre?: string;
  cargo?: string;
}

export interface SolicitudVenta {
  id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | "anulada" | string;
  motivo_anulacion?: string | null;
  anulada_por_ci?: string | null;
  anulada_en?: string | null;
  solicitud_origen_id?: string | null;
  solicitud_reabierta_id?: string | null;
  reabierta_por_ci?: string | null;
  reabierta_en?: string | null;
  cliente_venta_id?: string;
  cliente_venta?: ClienteVenta | null;
  oferta_venta_id?: string | null;
  /** Reserva de ventas vinculada — los vales emitidos contra esta solicitud descuentan de ella. */
  reserva_id?: string | null;
  almacen_id: string;
  almacen?: SolicitudVentaAlmacenInfo;
  trabajador_id?: string;
  trabajador?: SolicitudVentaTrabajadorInfo;
  materiales: SolicitudVentaMaterialItemDetalle[];
  pagada_totalmente?: boolean;
  precio_total?: number | null;
  total_pagado?: number | null;
  saldo_pendiente?: number | null;
  descuento_porcentaje?: number | null;
  pagos_ids?: string[];
  es_a_plazos?: boolean;
  plan_pagos?: PagoProgramado[];
  /** Si true, la deuda la gestiona el módulo Consignaciones. */
  es_consignacion?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface SolicitudVentaCreateData {
  cliente_venta_id?: string;
  cliente_venta?: ClienteVentaCreateData;
  almacen_id: string;
  materiales: SolicitudVentaMaterialItem[];
  oferta_venta_id?: string;
  /** Id de la reserva de ventas a la que se vincula la solicitud (opcional). */
  reserva_id?: string | null;
  descuento_free?: boolean;
  motivo_descuento_free?: string;
}

export interface SolicitudVentaUpdateData {
  cliente_venta_id?: string;
  cliente_venta?: ClienteVentaUpdateData;
  almacen_id?: string;
  materiales?: SolicitudVentaMaterialItem[];
  oferta_venta_id?: string;
  /** Vínculo con reserva. Enviar null para desvincular. */
  reserva_id?: string | null;
  es_a_plazos?: boolean;
  plan_pagos?: PagoProgramado[];
  descuento_free?: boolean;
  motivo_descuento_free?: string;
}

export interface SolicitudVentaPlanPagosData {
  es_a_plazos: boolean;
  plan_pagos: PagoProgramado[];
}

export interface SolicitudVentaAnularData {
  motivo_anulacion: string;
}

export interface SolicitudVentaListParams {
  skip?: number;
  limit?: number;
  cliente_venta_id?: string;
  cliente_venta_numero?: string;
  almacen_id?: string;
  trabajador_id?: string;
  q?: string; // Búsqueda de texto libre (antes era 'codigo')
  estado?: "nueva" | "usada" | "anulada" | string;
  pagada_totalmente?: boolean;
  comercial?: string;
  estado_pago?: "sin-pago" | "parcial" | string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface SolicitudVentaListResponse {
  solicitudes?: SolicitudVenta[];
  data?: SolicitudVenta[];
  total?: number;
  skip?: number;
  limit?: number;
}

/** Agregados devueltos por GET /operaciones/solicitudes-ventas/summary
 *  (calculados sobre todo el set filtrado, antes de skip/limit). */
export interface SolicitudVentaSummaryAgregados {
  precio_total_usd: number;
  pagado_usd: number;
  pendiente_usd: number;
}

export interface MaterialVentaWeb {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  um?: string;
  foto?: string;
  precio?: number;
  habilitar_venta_web?: boolean;
  categoria?: string;
  /** Máximo porcentaje de descuento permitido para este material (0-100) */
  porciento_rebajable_venta?: number;
}

// ========================================
// Summary Types (Optimized for Table Views)
// ========================================

export interface SolicitudVentaSummaryMaterial {
  material_id: string;
  nombre?: string | null;
  material_nombre?: string | null;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  um?: string | null;
  cantidad: number;
  precio?: number;
  descuento_porcentaje?: number;
  aumento_porcentaje?: number;
  precio_con_descuento?: number;
  subtotal?: number;
}

export interface SolicitudVentaSummary {
  id: string;
  codigo?: string;
  estado?: "nueva" | "usada" | "anulada" | string;
  cliente_venta_id?: string | null;
  cliente_venta_nombre?: string | null;
  comercial?: string | null;
  almacen_nombre?: string;
  creador_nombre?: string;
  /** Cadena legible de materiales — e.g. "4 materiales" (campo legacy) */
  materiales_resumen?: string;
  /** Array completo de materiales con precios (nuevo backend) */
  materiales?: SolicitudVentaSummaryMaterial[];
  /** Suma de subtotales de materiales (ya con descuentos por material aplicados) */
  precio_total?: number | null;
  /** Igual a precio_total en el nuevo modelo (descuentos ya aplicados en materiales) */
  precio_neto?: number | null;
  /** Acumulado pagado */
  total_pagado?: number | null;
  /** Lo que queda por pagar */
  monto_pendiente?: number | null;
  pagada_totalmente?: boolean;
  descuento_porcentaje?: number | null;
  /** Si true, la deuda la gestiona el módulo Consignaciones. */
  es_consignacion?: boolean;
  fecha_creacion?: string;
}

export interface SolicitudVentaSummaryResponse {
  success?: boolean;
  message?: string;
  data: SolicitudVentaSummary[] | { solicitudes?: SolicitudVentaSummary[] };
  total: number;
  solicitudes?: SolicitudVentaSummary[];
}
