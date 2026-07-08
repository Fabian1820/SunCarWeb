import { apiRequest } from "@/lib/api-config";
import type { Factura } from "@/lib/types/feats/facturas/factura-types";

export type { Factura as FacturaInstaladora };

/* ── Tipos: Lista principal ───────────────────────────────────────── */

export interface ObraTerminada {
  oferta_id?: string | null;
  numero_oferta?: string | null;
  cliente_numero?: string | null;
  cliente_nombre?: string | null;
  nombre_completo?: string | null;
  estado_cliente?: string | null;
  carnet_identidad?: string | null;
  comercial?: string | null;
  fecha_creacion?: string | null;
  fecha_equipo_instalado?: string | null;
  precio_final?: number | null;
  total_materiales?: number | null;
  ganancia?: number | null;
  total_pagado?: number | null;
  total_devuelto?: number | null;
  monto_pendiente?: number | null;
  /** Descuento de la oferta = descuento comercial + asumido por la empresa + compensación. */
  descuento_oferta?: number | null;
  monto_descuento?: number | null;
  descuento_porcentaje?: number | null;
  monto_asumido_empresa?: number | null;
  monto_compensacion?: number | null;
  cantidad_pagos?: number | null;
  almacen_nombre?: string | null;
  facturada?: boolean | null;
  numero_factura?: string | null;
  /** Materiales de la oferta, embebidos directamente en el listado (igual que vales de salida). */
  materiales?: MaterialOferta[] | null;
}

/** Totales globales sobre todo el conjunto filtrado (no la página actual). */
export interface ObrasTerminadasTotales {
  total_cobrado: number;
  total_pendiente: number;
  total_facturado: number;
  total_descuento: number;
}

export interface ObrasTerminadasListResponse {
  success: boolean;
  data: ObraTerminada[];
  total: number;
  totales?: ObrasTerminadasTotales;
  skip: number;
  limit: number;
}

/* ── Tipos: Detalle de oferta ─────────────────────────────────────── */

export interface EntregaMaterial {
  fecha?: string | null;
  cantidad?: number | null;
  vale_salida_id?: string | null;
}

export interface MaterialOferta {
  material_codigo?: string | null;
  descripcion?: string | null;
  /** Nombre del material resuelto por el backend desde el catálogo. */
  nombre?: string | null;
  categoria?: string | null;
  cantidad?: number | null;
  precio?: number | null;
  precio_original?: number | null;
  margen_asignado?: number | null;
  en_servicio?: boolean | null;
  cantidad_pendiente_por_entregar?: number | null;
  entregas?: EntregaMaterial[] | null;
}

export interface PagoObra {
  id?: string | null;
  fecha?: string | null;
  tipo_pago?: string | null;
  metodo_pago?: string | null;
  monto?: number | null;
  moneda?: string | null;
  tasa_cambio?: number | null;
  monto_usd?: number | null;
  nombre_pagador?: string | null;
  pago_cliente?: boolean | null;
  carnet_pagador?: string | null;
  recibido_por?: string | null;
  comprobante_transferencia?: string | null;
  notas?: string | null;
  diferencia?: number | null;
  fecha_creacion?: string | null;
  total_devuelto?: number | null;
}

export interface MaterialUtilizado {
  nombre?: string | null;
  cantidad_utilizada?: number | null;
}

export interface TrabajoDiarioObra {
  id: string;
  fecha?: string | null;
  created_at?: string | null;
  tipo_trabajo?: string | null;
  instaladores?: string[] | null;
  inicio?: string | null;
  fin?: string | null;
  queda_pendiente?: unknown;
  problema_encontrado?: string | null;
  solucion?: string | null;
  instalacion_terminada?: boolean | null;
  materiales_utilizados?: MaterialUtilizado[] | null;
}

export interface MaterialVale {
  cantidad?: number | null;
  numero_serie?: string | null;
  material?: { codigo?: string | null; nombre?: string | null; descripcion?: string | null } | null;
}

export interface ValeSalidaObra {
  id: string;
  codigo?: string | null;
  fecha_creacion?: string | null;
  estado?: string | null;
  motivo_anulacion?: string | null;
  recogido_por?: string | null;
  materiales?: MaterialVale[] | null;
}

export interface FacturaClienteObra {
  id?: string | null;
  nombre?: string | null;
  nombre_completo?: string | null;
  numero_oferta?: string | null;
  numero_factura?: string | null;
  fecha_facturacion?: string | null;
  estado?: string | null;
  facturada?: boolean | null;
  precio_final?: number | null;
  total_materiales?: number | null;
  total_pagado?: number | null;
  monto_pendiente?: number | null;
  materiales?: MaterialOferta[] | null;
  pagos?: PagoObra[] | null;
}

export interface OfertaDetalleObras {
  success: boolean;
  materiales: MaterialOferta[];
  pagos: PagoObra[];
  trabajos: TrabajoDiarioObra[];
  vales: ValeSalidaObra[];
  facturas: Factura[];
  facturas_cliente?: FacturaClienteObra[] | null;
}

/** @deprecated Usa OfertaDetalleObras — se mantiene por compatibilidad con el hook */
export interface ClienteDetalleObras {
  trabajos: TrabajoDiarioObra[];
  vales: ValeSalidaObra[];
}

/* ── Filtros ────────────────────────────────────────────────────────── */

export interface ObrasTerminadasFiltros {
  skip?: number;
  limit?: number;
  cliente_numero?: string;
  estado_cliente?: string;
  comercial?: string;
  q?: string;
  estado_pago?: "todos" | "pagado" | "pendiente";
  estado_factura?: "todos" | "pagada" | "pendiente" | "sin_factura";
  fecha_creacion_desde?: string;
  fecha_creacion_hasta?: string;
  fecha_equipo_desde?: string;
  fecha_equipo_hasta?: string;
}

/* ── Servicio ───────────────────────────────────────────────────────── */

const BASE = "/obras-terminadas";

export const ObrasTerminadasService = {
  async getDatos(
    filtros: ObrasTerminadasFiltros = {},
    signal?: AbortSignal,
  ): Promise<ObrasTerminadasListResponse> {
    const params = new URLSearchParams();
    if (filtros.skip != null)          params.set("skip",           String(filtros.skip));
    if (filtros.limit != null)         params.set("limit",          String(filtros.limit));
    if (filtros.cliente_numero)        params.set("cliente_numero", filtros.cliente_numero);
    if (filtros.estado_cliente)        params.set("estado_cliente", filtros.estado_cliente);
    if (filtros.comercial)             params.set("comercial",      filtros.comercial);
    if (filtros.q)                     params.set("q",              filtros.q);
    if (filtros.estado_pago)           params.set("estado_pago",     filtros.estado_pago);
    if (filtros.estado_factura)        params.set("estado_factura",  filtros.estado_factura);
    if (filtros.fecha_creacion_desde)  params.set("fecha_creacion_desde", filtros.fecha_creacion_desde);
    if (filtros.fecha_creacion_hasta)  params.set("fecha_creacion_hasta", filtros.fecha_creacion_hasta);
    if (filtros.fecha_equipo_desde)    params.set("fecha_equipo_desde", filtros.fecha_equipo_desde);
    if (filtros.fecha_equipo_hasta)    params.set("fecha_equipo_hasta", filtros.fecha_equipo_hasta);
    const qs = params.toString();
    const url = qs ? `${BASE}/datos?${qs}` : `${BASE}/datos`;
    return apiRequest<ObrasTerminadasListResponse>(url, { method: "GET", signal });
  },

  async getOfertaDetalle(
    ofertaId: string,
    signal?: AbortSignal,
  ): Promise<OfertaDetalleObras> {
    return apiRequest<OfertaDetalleObras>(
      `${BASE}/oferta/${encodeURIComponent(ofertaId)}/detalle`,
      { method: "GET", signal },
    );
  },

  async getFacturasCliente(
    ofertaId: string,
    signal?: AbortSignal,
  ): Promise<FacturaClienteObra[]> {
    return apiRequest<FacturaClienteObra[]>(
      `${BASE}/oferta/${encodeURIComponent(ofertaId)}/facturas-cliente`,
      { method: "GET", signal },
    );
  },

  /** @deprecated Usa getOfertaDetalle */
  async getClienteDetalle(
    clienteNumero: string,
    signal?: AbortSignal,
  ): Promise<ClienteDetalleObras> {
    return apiRequest<ClienteDetalleObras>(
      `${BASE}/cliente/${encodeURIComponent(clienteNumero)}/detalle`,
      { method: "GET", signal },
    );
  },
};
