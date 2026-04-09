/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  EnvioContenedor,
  EnvioContenedorCreateData,
  EnvioContenedorMaterial,
  EstadoEnvioContenedor,
} from "../../../types/feats/envios-contenedores/envio-contenedor-types";

const BASE_ENDPOINT = "/envios-contenedores";
const COLLECTION_ENDPOINT = "/envios-contenedores/";
const LOCAL_STORAGE_KEY = "suncar_envios_contenedores";

const extractApiError = (response: any): string | null => {
  if (!response) return null;

  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación de envíos de contenedores."
    );
  }

  if (response?.error?.message) {
    return response.error.message;
  }

  return null;
};

const unwrapPayload = (response: any): any => {
  if (response?.data !== undefined) return response.data;
  return response;
};

const normalizeEstado = (raw: any): EstadoEnvioContenedor => {
  const value = String(raw || "").toLowerCase();
  if (value === "cancelado") return "cancelado";
  if (value === "recibido" || value === "llego") return "recibido";
  return "despachado";
};

const mapMaterial = (raw: any): EnvioContenedorMaterial => ({
  material_id: String(raw?.material_id ?? raw?.id ?? ""),
  material_codigo: String(raw?.material_codigo ?? raw?.codigo ?? ""),
  material_nombre: String(
    raw?.material_nombre ?? raw?.nombre ?? raw?.descripcion ?? "",
  ),
  cantidad: Number(raw?.cantidad ?? 0),
});

const mapEnvio = (raw: any): EnvioContenedor => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  descripcion: typeof raw?.descripcion === "string" ? raw.descripcion : "",
  fecha_envio: String(raw?.fecha_envio ?? ""),
  fecha_llegada_aproximada: String(raw?.fecha_llegada_aproximada ?? ""),
  estado: normalizeEstado(raw?.estado),
  materiales: Array.isArray(raw?.materiales) ? raw.materiales.map(mapMaterial) : [],
  created_at:
    typeof raw?.created_at === "string"
      ? raw.created_at
      : typeof raw?.fecha_creacion === "string"
        ? raw.fecha_creacion
        : undefined,
  updated_at: typeof raw?.updated_at === "string" ? raw.updated_at : undefined,
});

const canUseLocalStorage = () => typeof window !== "undefined";

const readLocalEnvios = (): EnvioContenedor[] => {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(mapEnvio);
  } catch {
    return [];
  }
};

const writeLocalEnvios = (envios: EnvioContenedor[]) => {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(envios));
};

const sanitizeCreatePayload = (
  data: EnvioContenedorCreateData,
): EnvioContenedorCreateData => ({
  nombre: data.nombre.trim(),
  descripcion: data.descripcion?.trim() || "",
  fecha_envio: data.fecha_envio,
  fecha_llegada_aproximada: data.fecha_llegada_aproximada,
  estado: normalizeEstado(data.estado),
  materiales: data.materiales
    .map((item) => ({
      material_id: item.material_id,
      material_codigo: item.material_codigo,
      material_nombre: item.material_nombre,
      cantidad: Number(item.cantidad),
    }))
    .filter((item) => item.material_id && item.cantidad > 0),
});

export class EnvioContenedorService {
  static async getEnvios(): Promise<EnvioContenedor[]> {
    try {
      const raw = await apiRequest<any>(COLLECTION_ENDPOINT);
      const error = extractApiError(raw);
      if (error) throw new Error(error);

      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.envios)
          ? payload.envios
          : [];

      return list.map(mapEnvio);
    } catch {
      return readLocalEnvios();
    }
  }

  static async createEnvio(
    data: EnvioContenedorCreateData,
  ): Promise<EnvioContenedor> {
    const payload = sanitizeCreatePayload(data);

    if (!payload.nombre) {
      throw new Error("El nombre del contenedor es obligatorio.");
    }

    if (!payload.fecha_envio || !payload.fecha_llegada_aproximada) {
      throw new Error("Debe indicar fecha de envío y fecha aproximada de llegada.");
    }

    if (payload.materiales.length === 0) {
      throw new Error("Debe agregar al menos un material.");
    }

    try {
      const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const error = extractApiError(raw);
      if (error) throw new Error(error);

      return mapEnvio(unwrapPayload(raw));
    } catch {
      const now = new Date().toISOString();
      const localEnvios = readLocalEnvios();

      const envio: EnvioContenedor = {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}`,
        ...payload,
        created_at: now,
        updated_at: now,
      };

      writeLocalEnvios([envio, ...localEnvios]);
      return envio;
    }
  }

  static async getEnvioById(envioId: string): Promise<EnvioContenedor | null> {
    if (!envioId.trim()) return null;

    try {
      const raw = await apiRequest<any>(
        `${BASE_ENDPOINT}/${encodeURIComponent(envioId.trim())}`,
      );
      const error = extractApiError(raw);
      if (error) throw new Error(error);

      const payload = unwrapPayload(raw);
      if (!payload || typeof payload !== "object") return null;

      return mapEnvio(payload);
    } catch {
      const local = readLocalEnvios();
      return local.find((item) => item.id === envioId.trim()) || null;
    }
  }
}
