/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-config";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVenta } from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const BASE = "/pagos-ventas";
const BASE_FACTURAS = "/facturas-clientes-ventas";

export class PagoVentaService {
  static async getSolicitudesPendientes(): Promise<SolicitudVenta[]> {
    return SolicitudVentaService.getSolicitudes({ pagada_totalmente: false });
  }

  static async getTodosPagos(params?: {
    solicitud_venta_id?: string;
  }): Promise<PagoVenta[]> {
    const search = new URLSearchParams();
    if (params?.solicitud_venta_id)
      search.append("solicitud_venta_id", params.solicitud_venta_id);
    const endpoint = search.toString() ? `${BASE}/?${search}` : `${BASE}/`;
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
    const res: any = await apiRequest(`${BASE_FACTURAS}/`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.facturas)) return res.facturas;
    return [];
  }

  static async crearFactura(
    data: FacturaClienteVentaCreateData,
  ): Promise<FacturaClienteVenta> {
    const res: any = await apiRequest(`${BASE_FACTURAS}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res?.factura ?? res;
  }

  static async eliminarFactura(id: string): Promise<void> {
    await apiRequest(`${BASE_FACTURAS}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}
