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
    const endpoint = search.toString()
      ? `${BASE}/consolidado?${search}`
      : `${BASE}/consolidado`;
    const res: any = await apiRequest(endpoint);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.pagos)) return res.pagos;
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
  static async getFacturas(): Promise<FacturaClienteVenta[]> {
    try {
      const res: any = await apiRequest(`${BASE_FACTURAS_OPERACIONES}/consolidado`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.facturas)) return res.facturas;
      return [];
    } catch (error) {
      try {
        const res: any = await apiRequest(`${BASE_FACTURAS}/consolidado`);
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.facturas)) return res.facturas;
        return [];
      } catch {
        const res: any = await apiRequest(`${BASE_FACTURAS_LEGACY}/consolidado`);
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res?.facturas)) return res.facturas;
        return [];
      }
    }
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
