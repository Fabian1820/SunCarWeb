/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  AplicarPreciosMaterialPayload,
  EnvioContenedor,
  EnvioContenedorCreateData,
  EnvioContenedorMaterial,
  EstadoEnvioContenedor,
  StockMaterialEnvio,
  TipoEnvioContenedor,
} from "../../../types/feats/envios-contenedores/envio-contenedor-types";

const BASE_ENDPOINT = "/envios-contenedores";
const COLLECTION_ENDPOINT = "/envios-contenedores/";

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

const normalizeEstado = (raw: any): EstadoEnvioContenedor => {
  const value = String(raw || "").toLowerCase();
  if (value === "cancelado") return "cancelado";
  if (value === "recibido") return "recibido";
  return "despachado";
};

const normalizeTipo = (raw: any): TipoEnvioContenedor | undefined => {
  const value = String(raw || "").toLowerCase();
  if (value === "maritimo") return "maritimo";
  if (value === "aereo") return "aereo";
  if (value === "otro") return "otro";
  return undefined;
};

const mapMaterial = (raw: any): EnvioContenedorMaterial => ({
  material_id: String(raw?.material_id ?? raw?.id ?? ""),
  material_codigo: String(raw?.material_codigo ?? raw?.codigo ?? ""),
  material_nombre: String(raw?.material_nombre ?? raw?.nombre ?? raw?.descripcion ?? ""),
  cantidad: Number(raw?.cantidad ?? 0),
  precio_unitario_cif: Number(raw?.precio_unitario_cif ?? 0),
  porciento_extra: Number(raw?.porciento_extra ?? 0),
  precio_venta_calc: raw?.precio_venta_calc != null ? Number(raw.precio_venta_calc) : undefined,
  precio_instaladora_calc: raw?.precio_instaladora_calc != null ? Number(raw.precio_instaladora_calc) : undefined,
  porciento_rebajable_venta: Number(raw?.porciento_rebajable_venta ?? 0),
});

const mapEnvio = (raw: any): EnvioContenedor => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  descripcion: typeof raw?.descripcion === "string" ? raw.descripcion : "",
  fecha_envio: String(raw?.fecha_envio ?? ""),
  fecha_llegada_aproximada: String(raw?.fecha_llegada_aproximada ?? ""),
  estado: normalizeEstado(raw?.estado),
  tipo_envio: normalizeTipo(raw?.tipo_envio),
  pagado: Boolean(raw?.pagado ?? false),
  costos: Array.isArray(raw?.costos)
    ? raw.costos.map((c: any) => ({
        descripcion: String(c?.descripcion ?? ""),
        monto: Number(c?.monto ?? 0),
        moneda: (["USD", "EUR", "MLC", "CUP"].includes(c?.moneda) ? c.moneda : "USD") as any,
      }))
    : [],
  porciento_instaladora: Number(raw?.porciento_instaladora ?? 0),
  porciento_ventas: Number(raw?.porciento_ventas ?? 0),
  materiales: Array.isArray(raw?.materiales) ? raw.materiales.map(mapMaterial) : [],
  created_at: typeof raw?.created_at === "string" ? raw.created_at : undefined,
  updated_at: typeof raw?.updated_at === "string" ? raw.updated_at : undefined,
});

export class EnvioContenedorService {
  static async getEnvios(): Promise<EnvioContenedor[]> {
    try {
      const raw = await apiRequest<any>(COLLECTION_ENDPOINT);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.envios) ? payload.envios : [];
      return list.map(mapEnvio);
    } catch {
      return [];
    }
  }

  static async createEnvio(data: EnvioContenedorCreateData): Promise<EnvioContenedor> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapEnvio(unwrapPayload(raw));
  }

  static async getEnvioById(envioId: string): Promise<EnvioContenedor | null> {
    if (!envioId.trim()) return null;
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(envioId.trim())}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      if (!payload || typeof payload !== "object") return null;
      return mapEnvio(payload);
    } catch {
      return null;
    }
  }

  static async updateEnvio(envioId: string, data: Partial<EnvioContenedorCreateData>): Promise<EnvioContenedor> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(envioId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapEnvio(unwrapPayload(raw));
  }

  static async deleteEnvio(envioId: string): Promise<void> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(envioId)}`, {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }

  static async getStockMateriales(envioId: string): Promise<StockMaterialEnvio[]> {
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(envioId)}/stock-materiales`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const list = unwrapPayload(raw);
      return Array.isArray(list)
        ? list.map((item: any) => ({
            material_id: String(item?.material_id ?? ""),
            material_codigo: String(item?.material_codigo ?? ""),
            material_nombre: String(item?.material_nombre ?? ""),
            cantidad_envio: Number(item?.cantidad_envio ?? 0),
            cantidad_stock_actual: Number(item?.cantidad_stock_actual ?? 0),
          }))
        : [];
    } catch {
      return [];
    }
  }

  static async aplicarPrecios(
    envioId: string,
    materiales: AplicarPreciosMaterialPayload[],
  ): Promise<EnvioContenedor> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(envioId)}/aplicar-precios`,
      {
        method: "POST",
        body: JSON.stringify({ materiales }),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapEnvio(unwrapPayload(raw));
  }
}
