import { apiRequest } from "@/lib/api-config";

/* ── Tipos ─────────────────────────────────────────────────────────── */

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
  desglose_billetes?: Record<string, number> | null;
  notas?: string | null;
  diferencia?: number | null;
  fecha_creacion?: string | null;
  total_devuelto?: number | null;
}

export interface DevolucionObra {
  id?: string | null;
  pago_id?: string | null;
  monto_devuelto?: number | null;
  fecha?: string | null;
  motivo_devolucion?: string | null;
}

export interface ContactoObra {
  nombre?: string | null;
  codigo?: string | null;
  telefono?: string | null;
  carnet?: string | null;
  estado?: string | null;
}

export interface ObraTerminada {
  oferta_id?: string | null;
  numero_oferta?: string | null;
  nombre_completo?: string | null;
  cliente_numero?: string | null;
  precio_final?: number | null;
  total_materiales?: number | null;
  monto_pendiente?: number | null;
  total_pagado?: number | null;
  total_devuelto?: number | null;
  cantidad_pagos?: number | null;
  almacen_nombre?: string | null;
  fecha_instalacion_cliente?: string | null;
  estado?: string | null;
  comercial_nombre?: string | null;
  fecha_creacion?: string | null;
  contacto?: ContactoObra | null;
  pagos?: PagoObra[] | null;
  devoluciones?: DevolucionObra[] | null;
}

export interface ObrasTerminadasListResponse {
  success: boolean;
  data: ObraTerminada[];
  total: number;
  skip: number;
  limit: number;
}

/* Detalle lazy */

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
  queda_pendiente?: boolean | null;
  problema_encontrado?: string | null;
  solucion?: string | null;
  instalacion_terminada?: boolean | null;
  materiales_utilizados?: MaterialUtilizado[] | null;
}

export interface MaterialVale {
  cantidad?: number | null;
  numero_serie?: string | null;
  material?: { nombre?: string | null; descripcion?: string | null } | null;
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
}

/* ── Servicio ───────────────────────────────────────────────────────── */

const BASE = "/obras-terminadas";

export const ObrasTerminadasService = {
  /**
   * Lista paginada de obras terminadas con pagos, devoluciones y datos del cliente.
   * Un solo endpoint — toda la agregación ocurre en el backend.
   */
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

    const qs = params.toString();
    const url = qs ? `${BASE}/datos?${qs}` : `${BASE}/datos`;
    const raw = await apiRequest<ObrasTerminadasListResponse>(url, { method: "GET", signal });
    return raw;
  },

  /**
   * Detalle lazy de un cliente: trabajos_diarios + vales_salida.
   */
  async getClienteDetalle(
    clienteNumero: string,
    signal?: AbortSignal,
  ): Promise<ClienteDetalleObras> {
    const raw = await apiRequest<ClienteDetalleObras>(
      `${BASE}/cliente/${encodeURIComponent(clienteNumero)}/detalle`,
      { method: "GET", signal },
    );
    return raw;
  },
};
