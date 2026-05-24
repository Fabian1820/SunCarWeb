/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-config";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVenta } from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  PagoVentaListParams,
  PagoVentaListResponse,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
  FacturaVentaListParams,
  FacturaVentaListResponse,
  FacturaVentaResumen,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const BASE = "/pagos-ventas";
const BASE_FACTURAS = "/facturas-ventas";
const BASE_FACTURAS_LEGACY = "/facturas-clientes-ventas";
const BASE_FACTURAS_OPERACIONES = "/operaciones/facturas-ventas";

const normalizePago = (raw: any): PagoVenta => {
  const pago = raw.pago ?? {};
  return {
    ...raw,
    ...pago,
    id: raw.id ?? pago.id ?? null,
    factura_numero:
      raw.factura_numero ??
      raw.numero_factura ??
      raw.factura?.numero_factura ??
      pago.numero_factura ??
      null,
    cliente_nombre:
      raw.cliente_nombre ??
      raw.nombre_cliente ??
      raw.cliente?.nombre ??
      raw.cliente_venta?.nombre ??
      raw.solicitud?.cliente_venta?.nombre ??
      null,
    comercial:
      raw.comercial ??
      raw.cliente?.comercial ??
      raw.cliente_venta?.comercial ??
      raw.solicitud?.cliente_venta?.comercial ??
      null,
    solicitud_codigo:
      raw.solicitud_codigo ??
      raw.codigo_solicitud ??
      raw.solicitud?.codigo ??
      null,
    materiales:
      raw.materiales ??
      raw.solicitud?.materiales ??
      null,
    monto: raw.monto ?? pago.monto ?? null,
    moneda: raw.moneda ?? pago.moneda ?? null,
    monto_usd: raw.monto_usd ?? pago.monto_usd ?? null,
    metodo_pago: raw.metodo_pago ?? pago.metodo_pago ?? null,
    desglose_billetes: raw.desglose_billetes ?? pago.desglose_billetes ?? null,
    tasa_cambio: raw.tasa_cambio ?? pago.tasa_cambio ?? null,
    recibido_por: raw.recibido_por ?? pago.recibido_por ?? null,
    notas: raw.notas ?? pago.notas ?? null,
    descuento_porcentaje: raw.descuento_porcentaje ?? pago.descuento_porcentaje ?? null,
    monto_pendiente_despues_pago: raw.monto_pendiente_despues_pago ?? pago.monto_pendiente_despues_pago ?? null,
  };
};

export class PagoVentaService {
  static async getSolicitudesPendientes(): Promise<SolicitudVenta[]> {
    return SolicitudVentaService.getSolicitudes({ pagada_totalmente: false });
  }

  /**
   * Lista paginada de pagos con filtros. Devuelve `{ data, total }` donde
   * `total` refleja el resultado de aplicar los filtros.
   */
  static async getTodosPagos(
    params: PagoVentaListParams = {},
  ): Promise<PagoVentaListResponse> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.q) search.append("q", params.q);
    if (params.metodo_pago) search.append("metodo_pago", params.metodo_pago);
    if (params.moneda) search.append("moneda", params.moneda);
    if (params.comercial) search.append("comercial", params.comercial);
    if (params.fecha_desde) search.append("fecha_desde", params.fecha_desde);
    if (params.fecha_hasta) search.append("fecha_hasta", params.fecha_hasta);
    if (params.factura_venta_id)
      search.append("factura_venta_id", params.factura_venta_id);
    if (params.solicitud_venta_id)
      search.append("solicitud_venta_id", params.solicitud_venta_id);
    if (params.cliente_venta_id)
      search.append("cliente_venta_id", params.cliente_venta_id);

    const qs = search.toString();
    const endpoints = qs
      ? [`${BASE}/consolidado?${qs}`, `${BASE}/?${qs}`]
      : [`${BASE}/consolidado`, `${BASE}/`];

    const extract = (res: any): { data: PagoVenta[]; total: number } | null => {
      if (res?.detail || res?.error || res?.success === false) return null;
      let arr: any[] | null = null;
      let total: number | undefined;
      if (Array.isArray(res)) {
        arr = res;
        total = res.length;
      } else if (Array.isArray(res?.data)) {
        arr = res.data;
        total = typeof res.total === "number" ? res.total : res.data.length;
      } else if (Array.isArray(res?.pagos)) {
        arr = res.pagos;
        total = typeof res.total === "number" ? res.total : res.pagos.length;
      } else if (Array.isArray(res?.data?.pagos)) {
        arr = res.data.pagos;
        total =
          typeof res.data.total === "number"
            ? res.data.total
            : res.data.pagos.length;
      }
      if (!arr) return null;
      return { data: arr.map(normalizePago), total: total ?? arr.length };
    };

    for (const endpoint of endpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        const out = extract(res);
        if (out !== null) return out;
      } catch {
        // intentar siguiente endpoint
      }
    }
    return { data: [], total: 0 };
  }

  static async getPagoById(id: string): Promise<PagoVenta> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`);
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return normalizePago(res?.data ?? res);
  }

  static async registrarPago(data: PagoVentaCreateData): Promise<PagoVenta> {
    const res: any = await apiRequest(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res?.pago ?? res;
  }

  static async eliminarPago(id: string): Promise<void> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
  }
}

// Alias de compatibilidad
export const PagoClienteVentaService = PagoVentaService;

export class FacturaClienteVentaService {
  static async getSiguienteNumero(): Promise<string> {
    const anio   = new Date().getFullYear();
    const prefijo = `FV-${anio}-`;

    const calcularLocal = async (): Promise<string> => {
      try {
        // Backend ordena por numero DESC; con limit=1 obtenemos la más reciente
        // y solo necesitamos un consecutivo > 0.
        const { data: facturas } = await FacturaClienteVentaService.getFacturas({
          q: prefijo,
          limit: 100,
        });
        const consecs = facturas
          .map((f) => f.numero_factura ?? "")
          .filter((n) => n.startsWith(prefijo))
          .map((n) => Number(n.slice(prefijo.length)))
          .filter((n) => Number.isFinite(n) && n > 0);
        const siguiente = consecs.length > 0 ? Math.max(...consecs) + 1 : 1;
        return `${prefijo}${String(siguiente).padStart(6, "0")}`;
      } catch {
        return `${prefijo}000001`;
      }
    };

    const backendEndpoints = [
      `${BASE_FACTURAS_OPERACIONES}/siguiente-numero`,
      `${BASE_FACTURAS}/siguiente-numero`,
      `${BASE_FACTURAS_LEGACY}/siguiente-numero`,
    ];
    const formatoValido = (n: string) => /^FV-\d{4}-\d{6}$/.test(n);

    for (const endpoint of backendEndpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        const numero =
          res?.numero ??
          res?.siguiente_numero ??
          res?.data?.numero ??
          res?.data?.siguiente_numero;
        if (numero && formatoValido(String(numero))) return String(numero);
      } catch {
        // intentar siguiente endpoint
      }
    }

    return calcularLocal();
  }

  /**
   * Lista paginada de facturas con filtros. Devuelve `{ data, total }` donde
   * `total` refleja el resultado de aplicar los filtros.
   */
  static async getFacturas(
    params: FacturaVentaListParams = {},
  ): Promise<FacturaVentaListResponse> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.q) search.append("q", params.q);
    if (params.estado) search.append("estado", params.estado);
    if (params.moneda) search.append("moneda", params.moneda);
    if (params.comercial) search.append("comercial", params.comercial);
    if (params.fecha_desde) search.append("fecha_desde", params.fecha_desde);
    if (params.fecha_hasta) search.append("fecha_hasta", params.fecha_hasta);

    const qs = search.toString();
    const suffix = qs ? `?${qs}` : "";

    const endpoints = [
      `${BASE_FACTURAS_OPERACIONES}/consolidado${suffix}`,
      `${BASE_FACTURAS_OPERACIONES}/${suffix}`,
      `${BASE_FACTURAS}/consolidado${suffix}`,
      `${BASE_FACTURAS}/${suffix}`,
      `${BASE_FACTURAS_LEGACY}/consolidado${suffix}`,
      `${BASE_FACTURAS_LEGACY}/${suffix}`,
    ];

    const extract = (
      res: any,
    ): { data: FacturaClienteVenta[]; total: number } | null => {
      if (res?.detail || res?.error || res?.success === false) return null;
      let arr: FacturaClienteVenta[] | null = null;
      let total: number | undefined;
      if (Array.isArray(res)) {
        arr = res;
        total = res.length;
      } else if (Array.isArray(res?.data)) {
        arr = res.data;
        total = typeof res.total === "number" ? res.total : res.data.length;
      } else if (Array.isArray(res?.facturas)) {
        arr = res.facturas;
        total =
          typeof res.total === "number" ? res.total : res.facturas.length;
      } else if (Array.isArray(res?.data?.facturas)) {
        arr = res.data.facturas;
        total =
          typeof res.data.total === "number"
            ? res.data.total
            : res.data.facturas.length;
      } else if (Array.isArray(res?.data?.data)) {
        arr = res.data.data;
        total =
          typeof res.data.total === "number"
            ? res.data.total
            : res.data.data.length;
      }
      if (!arr) return null;
      return { data: arr, total: total ?? arr.length };
    };

    for (const endpoint of endpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        const out = extract(res);
        if (out !== null) return out;
      } catch {
        // Intentar siguiente endpoint
      }
    }
    return { data: [], total: 0 };
  }

  static async crearFactura(
    data: FacturaClienteVentaCreateData,
  ): Promise<FacturaClienteVenta> {
    try {
      const res: any = await apiRequest(`${BASE_FACTURAS}/`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res?.error?.message) throw new Error(res.error.message);
      if (res?.detail) throw new Error(res.detail);
      return res?.factura ?? res;
    } catch (error) {
      const res: any = await apiRequest(`${BASE_FACTURAS_LEGACY}/`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res?.error?.message) throw new Error(res.error.message);
      if (res?.detail) throw new Error(res.detail);
      return res?.factura ?? res;
    }
  }

  static async eliminarFactura(id: string): Promise<void> {
    try {
      await apiRequest(`${BASE_FACTURAS}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (error) {
      await apiRequest(`${BASE_FACTURAS_LEGACY}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    }
  }

  static async getFacturaResumen(id: string): Promise<FacturaVentaResumen> {
    const encoded = encodeURIComponent(id);
    const endpoints = [
      `${BASE_FACTURAS_OPERACIONES}/${encoded}/resumen`,
      `${BASE_FACTURAS}/${encoded}/resumen`,
      `${BASE_FACTURAS_LEGACY}/${encoded}/resumen`,
    ];

    let lastError: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        if (res?.error?.message) throw new Error(res.error.message);
        if (res?.detail) throw new Error(res.detail);
        return (res?.data ?? res) as FacturaVentaResumen;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("No se pudo obtener el resumen de factura");
  }
}
