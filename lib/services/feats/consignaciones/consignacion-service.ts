/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiRequest } from "@/lib/api-config";
import type {
  Consignacion,
  ConsignacionCreateData,
  ConsignacionListParams,
  ConsignacionListResponse,
  EmitirFacturaConsignacionData,
  RegistrarDevolucionData,
} from "@/lib/types/feats/consignaciones/consignacion-types";

const BASE = "/consignaciones";

const unwrap = (res: any): any => {
  if (res?.error?.message) throw new Error(res.error.message);
  if (res?.detail) throw new Error(res.detail);
  if (res?.success === false && res?.message) throw new Error(res.message);
  return res?.data ?? res;
};

export class ConsignacionService {
  static async list(
    params: ConsignacionListParams = {},
  ): Promise<ConsignacionListResponse> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.estado) search.append("estado", params.estado);
    if (params.cliente_venta_id)
      search.append("cliente_venta_id", params.cliente_venta_id);
    if (params.solicitud_venta_id)
      search.append("solicitud_venta_id", params.solicitud_venta_id);

    const qs = search.toString();
    const url = qs ? `${BASE}/?${qs}` : `${BASE}/`;
    const res: any = await apiRequest(url);
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    const data: Consignacion[] = res?.data ?? [];
    const total: number =
      typeof res?.total === "number" ? res.total : data.length;
    return { data, total };
  }

  static async getById(id: string): Promise<Consignacion> {
    const res: any = await apiRequest(`${BASE}/${encodeURIComponent(id)}`);
    return unwrap(res) as Consignacion;
  }

  static async getBySolicitudVentaId(
    solicitudVentaId: string,
  ): Promise<Consignacion | null> {
    try {
      const res: any = await apiRequest(
        `${BASE}/por-solicitud/${encodeURIComponent(solicitudVentaId)}`,
      );
      return unwrap(res) as Consignacion;
    } catch {
      return null;
    }
  }

  static async crear(data: ConsignacionCreateData): Promise<Consignacion> {
    const res: any = await apiRequest(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return unwrap(res) as Consignacion;
  }

  static async vincularPago(
    consignacionId: string,
    pagoVentaId: string,
  ): Promise<Consignacion> {
    const res: any = await apiRequest(
      `${BASE}/${encodeURIComponent(consignacionId)}/pagos`,
      {
        method: "POST",
        body: JSON.stringify({ pago_venta_id: pagoVentaId }),
      },
    );
    return unwrap(res) as Consignacion;
  }

  static async registrarDevolucion(
    consignacionId: string,
    data: RegistrarDevolucionData,
  ): Promise<Consignacion> {
    const res: any = await apiRequest(
      `${BASE}/${encodeURIComponent(consignacionId)}/devoluciones`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return unwrap(res) as Consignacion;
  }

  static async anular(
    consignacionId: string,
    motivo?: string,
  ): Promise<Consignacion> {
    const res: any = await apiRequest(
      `${BASE}/${encodeURIComponent(consignacionId)}/anular`,
      {
        method: "POST",
        body: JSON.stringify({ motivo: motivo ?? null }),
      },
    );
    return unwrap(res) as Consignacion;
  }

  static async registrarPago(
    solicitudVentaId: string,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    const { apiRequest } = await import("@/lib/api-config");
    const res: any = await apiRequest("/pagos-ventas/", {
      method: "POST",
      body: JSON.stringify({ ...data, solicitud_venta_id: solicitudVentaId }),
    });
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res?.data ?? res;
  }

  static async emitirFactura(
    consignacionId: string,
    data: EmitirFacturaConsignacionData,
  ): Promise<unknown> {
    const res: any = await apiRequest(
      `${BASE}/${encodeURIComponent(consignacionId)}/facturas`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    if (res?.error?.message) throw new Error(res.error.message);
    if (res?.detail) throw new Error(res.detail);
    return res?.data ?? res;
  }

  static async eliminar(consignacionId: string): Promise<void> {
    const res: any = await apiRequest(
      `${BASE}/${encodeURIComponent(consignacionId)}`,
      { method: "DELETE" },
    );
    unwrap(res);
  }
}
