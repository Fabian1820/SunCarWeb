/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  AprobarSolicitudRequest,
  DenegarSolicitudRequest,
  EstadoSolicitudEntrada,
  MaterialSolicitudEntrada,
  OrigenSolicitudEntrada,
  SolicitudEntradaAlmacen,
  SolicitudEntradaAlmacenCreateData,
  SplitPool,
} from "../../../types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";

const BASE_ENDPOINT = "/solicitudes-entrada-almacen";
const COLLECTION_ENDPOINT = "/solicitudes-entrada-almacen/";

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación."
    );
  }
  if (response?.error?.message) return response.error.message;
  return null;
};

const unwrapPayload = (response: any): any => {
  if (response?.data !== undefined) return response.data;
  return response;
};

const normalizeEstado = (raw: any): EstadoSolicitudEntrada => {
  const value = String(raw || "").toLowerCase();
  if (value === "aprobada") return "aprobada";
  if (value === "denegada") return "denegada";
  return "pendiente";
};

const normalizeOrigen = (raw: any): OrigenSolicitudEntrada => {
  const value = String(raw || "").toLowerCase();
  if (value === "consignacion") return "consignacion";
  return "compra";
};

const mapSplit = (raw: any): SplitPool => ({
  indistinto: Number(raw?.indistinto ?? 0),
  instaladora: Number(raw?.instaladora ?? 0),
  ventas: Number(raw?.ventas ?? 0),
});

const mapMaterial = (raw: any): MaterialSolicitudEntrada => ({
  material_id: String(raw?.material_id ?? ""),
  material_codigo: String(raw?.material_codigo ?? ""),
  material_nombre: String(raw?.material_nombre ?? ""),
  cantidad_total: Number(raw?.cantidad_total ?? 0),
  costo_unitario: Number(raw?.costo_unitario ?? 0),
  split: mapSplit(raw?.split),
});

const mapSolicitud = (raw: any): SolicitudEntradaAlmacen => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  origen: normalizeOrigen(raw?.origen),
  compra_id: String(raw?.compra_id ?? ""),
  consignacion_id:
    typeof raw?.consignacion_id === "string" && raw.consignacion_id
      ? raw.consignacion_id
      : undefined,
  almacen_id: String(raw?.almacen_id ?? ""),
  materiales: Array.isArray(raw?.materiales) ? raw.materiales.map(mapMaterial) : [],
  estado: normalizeEstado(raw?.estado),
  motivo_denegacion: typeof raw?.motivo_denegacion === "string" ? raw.motivo_denegacion : undefined,
  observaciones_recepcion: typeof raw?.observaciones_recepcion === "string" ? raw.observaciones_recepcion : undefined,
  movimientos_generados: Array.isArray(raw?.movimientos_generados) ? raw.movimientos_generados.map(String) : [],
  kardex_generados: Array.isArray(raw?.kardex_generados) ? raw.kardex_generados.map(String) : [],
  creado_por_ci: typeof raw?.creado_por_ci === "string" ? raw.creado_por_ci : undefined,
  aprobado_por_ci: typeof raw?.aprobado_por_ci === "string" ? raw.aprobado_por_ci : undefined,
  fecha_creacion: String(raw?.fecha_creacion ?? ""),
  fecha_resolucion: typeof raw?.fecha_resolucion === "string" ? raw.fecha_resolucion : undefined,
});

export interface ListSolicitudesParams {
  compra_id?: string;
  almacen_id?: string;
  estado?: EstadoSolicitudEntrada;
  skip?: number;
  limit?: number;
}

const buildQuery = (params: ListSolicitudesParams | undefined): string => {
  if (!params) return "";
  const entries: string[] = [];
  if (params.compra_id) entries.push(`compra_id=${encodeURIComponent(params.compra_id)}`);
  if (params.almacen_id) entries.push(`almacen_id=${encodeURIComponent(params.almacen_id)}`);
  if (params.estado) entries.push(`estado=${encodeURIComponent(params.estado)}`);
  if (params.skip != null) entries.push(`skip=${params.skip}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
};

export class SolicitudEntradaAlmacenService {
  static async getSolicitudes(params?: ListSolicitudesParams): Promise<SolicitudEntradaAlmacen[]> {
    try {
      const raw = await apiRequest<any>(`${COLLECTION_ENDPOINT}${buildQuery(params)}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.solicitudes)
          ? payload.solicitudes
          : [];
      return list.map(mapSolicitud);
    } catch {
      return [];
    }
  }

  static async getSolicitudById(solicitudId: string): Promise<SolicitudEntradaAlmacen | null> {
    if (!solicitudId.trim()) return null;
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(solicitudId.trim())}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      if (!payload || typeof payload !== "object") return null;
      return mapSolicitud(payload);
    } catch {
      return null;
    }
  }

  static async createSolicitud(data: SolicitudEntradaAlmacenCreateData): Promise<SolicitudEntradaAlmacen> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async aprobarSolicitud(
    solicitudId: string,
    payload: AprobarSolicitudRequest = {},
  ): Promise<SolicitudEntradaAlmacen> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(solicitudId)}/aprobar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    // Detectar error estructurado de materiales pendientes de costeo
    const detail = (raw as any)?.detail;
    if (detail && typeof detail === "object" && detail.tipo === "pendiente_costeo") {
      const err = new Error(detail.message ?? "Materiales pendientes de costeo") as Error & {
        isPendienteCosteo: true;
        materialesBloqueados: PendienteCosteoMaterial[];
      };
      err.isPendienteCosteo = true;
      err.materialesBloqueados = Array.isArray(detail.materiales_bloqueados)
        ? detail.materiales_bloqueados
        : [];
      throw err;
    }
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async denegarSolicitud(
    solicitudId: string,
    payload: DenegarSolicitudRequest,
  ): Promise<SolicitudEntradaAlmacen> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(solicitudId)}/denegar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }
}
