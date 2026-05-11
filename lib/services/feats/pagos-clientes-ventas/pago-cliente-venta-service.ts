/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-config";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVenta } from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
  FacturaVentaResumen,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const BASE = "/pagos-ventas";
const BASE_FACTURAS = "/facturas-ventas";
const BASE_FACTURAS_LEGACY = "/facturas-clientes-ventas";
const BASE_FACTURAS_OPERACIONES = "/operaciones/facturas-ventas";

const normalizePago = (raw: any): PagoVenta => ({
  ...raw,
  // El backend puede devolver numero_factura en lugar de factura_numero
  factura_numero:
    raw.factura_numero ??
    raw.numero_factura ??
    raw.factura?.numero_factura ??
    raw.pago?.numero_factura ??
    null,
  // El backend puede devolver el nombre del cliente en distintas keys
  cliente_nombre:
    raw.cliente_nombre ??
    raw.nombre_cliente ??
    raw.cliente?.nombre ??
    raw.cliente_venta?.nombre ??
    raw.solicitud?.cliente_venta?.nombre ??
    null,
  // El backend puede devolver el código de la solicitud de distintas formas
  solicitud_codigo:
    raw.solicitud_codigo ??
    raw.codigo_solicitud ??
    raw.solicitud?.codigo ??
    null,
  // Materiales: a veces vienen anidados en la solicitud
  materiales:
    raw.materiales ??
    raw.solicitud?.materiales ??
    null,
});

export class PagoVentaService {
  static async getSolicitudesPendientes(): Promise<SolicitudVenta[]> {
    return SolicitudVentaService.getSolicitudes({ pagada_totalmente: false });
  }

  static async getTodosPagos(params?: {
    factura_venta_id?: string;
    solicitud_venta_id?: string;
    cliente_venta_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<PagoVenta[]> {
    const search = new URLSearchParams();
    if (params?.factura_venta_id)
      search.append("factura_venta_id", params.factura_venta_id);
    if (params?.solicitud_venta_id)
      search.append("solicitud_venta_id", params.solicitud_venta_id);
    if (params?.cliente_venta_id)
      search.append("cliente_venta_id", params.cliente_venta_id);
    if (params?.skip != null) search.append("skip", String(params.skip));
    if (params?.limit != null) search.append("limit", String(params.limit));

    const qs = search.toString();
    const endpoints = qs
      ? [`${BASE}/consolidado?${qs}`, `${BASE}/?${qs}`]
      : [`${BASE}/consolidado`, `${BASE}/`];

    const extract = (res: any): PagoVenta[] | null => {
      let arr: any[] | null = null;
      if (Array.isArray(res)) arr = res;
      else if (Array.isArray(res?.data)) arr = res.data;
      else if (Array.isArray(res?.pagos)) arr = res.pagos;
      else if (Array.isArray(res?.data?.pagos)) arr = res.data.pagos;
      else if (res?.detail || res?.error || res?.success === false) return null;
      return arr ? arr.map(normalizePago) : null;
    };

    for (const endpoint of endpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        const pagos = extract(res);
        if (pagos !== null) return pagos;
      } catch {
        // intentar siguiente endpoint
      }
    }
    return [];
  }

  static async getPagoById(id: string): Promise<PagoVenta> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`);
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res;
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
}

// Alias de compatibilidad
export const PagoClienteVentaService = PagoVentaService;

export class FacturaClienteVentaService {
  static async getSiguienteNumero(): Promise<string> {
    const anio   = new Date().getFullYear();
    const prefijo = `FV-${anio}-`;

    const calcularLocal = async (): Promise<string> => {
      try {
        const facturas = await FacturaClienteVentaService.getFacturas();
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

  static async getFacturas(): Promise<FacturaClienteVenta[]> {
    const extractFacturas = (res: any): FacturaClienteVenta[] | null => {
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.facturas)) return res.facturas;
      if (Array.isArray(res?.data?.facturas)) return res.data.facturas;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      // Si la respuesta es un error del backend, devolver null para intentar el siguiente endpoint
      if (res?.detail || res?.error || res?.success === false) return null;
      return null;
    };

    const endpoints = [
      `${BASE_FACTURAS_OPERACIONES}/consolidado`,
      `${BASE_FACTURAS_OPERACIONES}/`,
      `${BASE_FACTURAS}/consolidado`,
      `${BASE_FACTURAS}/`,
      `${BASE_FACTURAS_LEGACY}/consolidado`,
      `${BASE_FACTURAS_LEGACY}/`,
    ];

    for (const endpoint of endpoints) {
      try {
        const res: any = await apiRequest(endpoint);
        const facturas = extractFacturas(res);
        if (facturas !== null) return facturas;
      } catch {
        // Intentar siguiente endpoint
      }
    }
    return [];
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
