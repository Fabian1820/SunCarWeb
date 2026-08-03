/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  AlertaStockIgnorada,
  CompletarSolicitudData,
  CompletarSolicitudResponse,
  ListSolicitudesEnvioParams,
  MaterialSolicitudEnvio,
  MaterialesEnSolicitudActiva,
  SolicitudEnvio,
  SolicitudEnvioCreateData,
  SolicitudEnvioListResponse,
  SolicitudEnvioUpdateData,
} from "../../../types/feats/solicitudes-envio/solicitud-envio-types";

const BASE = "/solicitudes-envio";
const COLLECTION = "/solicitudes-envio/";

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

const mapMaterial = (raw: any): MaterialSolicitudEnvio => ({
  material_id: String(raw?.material_id ?? ""),
  material_codigo: String(raw?.material_codigo ?? ""),
  material_nombre: String(raw?.material_nombre ?? ""),
  material_descripcion: raw?.material_descripcion ?? null,
  material_foto: raw?.material_foto ?? null,
  um: raw?.um ?? null,
  cantidad: Number(raw?.cantidad ?? 0),
  cantidad_actual_snapshot:
    raw?.cantidad_actual_snapshot != null
      ? Number(raw.cantidad_actual_snapshot)
      : null,
  stockaje_minimo_snapshot:
    raw?.stockaje_minimo_snapshot != null
      ? Number(raw.stockaje_minimo_snapshot)
      : null,
  motivo: raw?.motivo ?? null,
  notas: raw?.notas ?? null,
});

const mapSolicitud = (raw: any): SolicitudEnvio => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  codigo: String(raw?.codigo ?? ""),
  almacen_id: raw?.almacen_id ?? null,
  urgencia: raw?.urgencia === "alta" ? "alta" : "normal",
  materiales: Array.isArray(raw?.materiales)
    ? raw.materiales.map(mapMaterial)
    : [],
  estado: (raw?.estado ?? "pendiente") as SolicitudEnvio["estado"],
  notas: raw?.notas ?? null,
  creada_por_ci: raw?.creada_por_ci ?? null,
  creada_en: raw?.creada_en ?? null,
  actualizada_en: raw?.actualizada_en ?? null,
  procesada_por_ci: raw?.procesada_por_ci ?? null,
  procesada_en: raw?.procesada_en ?? null,
  notas_internacional: raw?.notas_internacional ?? null,
  completada_por_ci: raw?.completada_por_ci ?? null,
  completada_en: raw?.completada_en ?? null,
  compra_id: raw?.compra_id ?? null,
  cancelada_por_ci: raw?.cancelada_por_ci ?? null,
  cancelada_en: raw?.cancelada_en ?? null,
  motivo_cancelacion: raw?.motivo_cancelacion ?? null,
});

const mapAlerta = (raw: any): AlertaStockIgnorada => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  material_id: String(raw?.material_id ?? ""),
  material_codigo: raw?.material_codigo ?? null,
  material_nombre: raw?.material_nombre ?? null,
  ignorada: Boolean(raw?.ignorada),
  motivo: raw?.motivo ?? null,
  ignorada_por_ci: raw?.ignorada_por_ci ?? null,
  ignorada_en: raw?.ignorada_en ?? null,
  reactivada_por_ci: raw?.reactivada_por_ci ?? null,
  reactivada_en: raw?.reactivada_en ?? null,
});

const buildQuery = (params?: ListSolicitudesEnvioParams): string => {
  if (!params) return "";
  const entries: string[] = [];
  if (params.estado) entries.push(`estado=${encodeURIComponent(params.estado)}`);
  if (params.almacen_id)
    entries.push(`almacen_id=${encodeURIComponent(params.almacen_id)}`);
  if (params.urgencia)
    entries.push(`urgencia=${encodeURIComponent(params.urgencia)}`);
  if (params.codigo) entries.push(`codigo=${encodeURIComponent(params.codigo)}`);
  if (params.material_codigo)
    entries.push(`material_codigo=${encodeURIComponent(params.material_codigo)}`);
  if (params.creada_por_ci)
    entries.push(`creada_por_ci=${encodeURIComponent(params.creada_por_ci)}`);
  if (params.desde) entries.push(`desde=${encodeURIComponent(params.desde)}`);
  if (params.hasta) entries.push(`hasta=${encodeURIComponent(params.hasta)}`);
  if (params.q) entries.push(`q=${encodeURIComponent(params.q)}`);
  if (params.page != null) entries.push(`page=${params.page}`);
  if (params.page_size != null) entries.push(`page_size=${params.page_size}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
};

export class SolicitudEnvioService {
  static async list(
    params?: ListSolicitudesEnvioParams,
  ): Promise<SolicitudEnvioListResponse> {
    const raw = await apiRequest<any>(`${COLLECTION}${buildQuery(params)}`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return {
      data: list.map(mapSolicitud),
      total: Number(raw?.total ?? list.length),
      page: Number(raw?.page ?? params?.page ?? 1),
      page_size: Number(raw?.page_size ?? params?.page_size ?? 20),
      total_pages: Number(raw?.total_pages ?? 1),
    };
  }

  static async getById(id: string): Promise<SolicitudEnvio | null> {
    if (!id.trim()) return null;
    const raw = await apiRequest<any>(`${BASE}/${encodeURIComponent(id)}`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const payload = unwrapPayload(raw);
    if (!payload || typeof payload !== "object") return null;
    return mapSolicitud(payload);
  }

  static async create(data: SolicitudEnvioCreateData): Promise<SolicitudEnvio> {
    const raw = await apiRequest<any>(COLLECTION, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async update(
    id: string,
    data: SolicitudEnvioUpdateData,
  ): Promise<SolicitudEnvio> {
    const raw = await apiRequest<any>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async marcarEnProceso(
    id: string,
    payload: { notas_internacional?: string } = {},
  ): Promise<SolicitudEnvio> {
    const raw = await apiRequest<any>(
      `${BASE}/${encodeURIComponent(id)}/marcar-en-proceso`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async completar(
    id: string,
    payload: CompletarSolicitudData,
  ): Promise<CompletarSolicitudResponse> {
    const raw = await apiRequest<any>(
      `${BASE}/${encodeURIComponent(id)}/completar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return {
      solicitud: mapSolicitud(raw?.solicitud ?? {}),
      compra_id: String(raw?.compra_id ?? ""),
    };
  }

  static async cancelar(id: string, motivo: string): Promise<SolicitudEnvio> {
    const raw = await apiRequest<any>(
      `${BASE}/${encodeURIComponent(id)}/cancelar`,
      {
        method: "POST",
        body: JSON.stringify({ motivo }),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapSolicitud(unwrapPayload(raw));
  }

  static async materialesEnSolicitudActiva(
    codigos?: string[],
  ): Promise<MaterialesEnSolicitudActiva> {
    const q = codigos && codigos.length > 0 ? `?codigos=${encodeURIComponent(codigos.join(","))}` : "";
    const raw = await apiRequest<any>(
      `${BASE}/materiales-en-solicitud-activa${q}`,
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const payload = unwrapPayload(raw);
    return (payload && typeof payload === "object" ? payload : {}) as MaterialesEnSolicitudActiva;
  }

  // ---------------- Alertas ignoradas ----------------
  static async listAlertasIgnoradas(): Promise<AlertaStockIgnorada[]> {
    const raw = await apiRequest<any>(`${BASE}/alertas-ignoradas`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map(mapAlerta);
  }

  static async ignorarAlerta(
    materialId: string,
    motivo?: string,
  ): Promise<AlertaStockIgnorada> {
    const raw = await apiRequest<any>(
      `${BASE}/alertas-ignoradas/${encodeURIComponent(materialId)}`,
      {
        method: "POST",
        body: JSON.stringify({ motivo }),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapAlerta(unwrapPayload(raw));
  }

  static async reactivarAlerta(
    materialId: string,
  ): Promise<AlertaStockIgnorada> {
    const raw = await apiRequest<any>(
      `${BASE}/alertas-ignoradas/${encodeURIComponent(materialId)}`,
      {
        method: "DELETE",
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapAlerta(unwrapPayload(raw));
  }
}
