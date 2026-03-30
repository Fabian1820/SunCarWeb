/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  TasaCambio,
  TasaCambioCreateRequest,
} from "../../../types/feats/tasa-cambio/tasa-cambio-types";

const BASE_ENDPOINT = "/tasas-cambio";
const COLLECTION_ENDPOINT = "/tasas-cambio/";

const extractApiError = (response: any): string | null => {
  if (!response) return null;

  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación de tasas de cambio."
    );
  }

  if (typeof response?.detail === "string") {
    return response.detail;
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

const mapTasaCambio = (raw: any): TasaCambio => ({
  id: String(raw?.id ?? raw?._id ?? raw?.fecha ?? ""),
  fecha: String(raw?.fecha ?? ""),
  usd_a_eur: Number(raw?.usd_a_eur ?? 0),
  usd_a_cup: Number(raw?.usd_a_cup ?? 0),
  created_at:
    typeof raw?.created_at === "string"
      ? raw.created_at
      : typeof raw?.fecha_creacion === "string"
        ? raw.fecha_creacion
        : undefined,
});

const normalizeFecha = (value: string): string => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("La fecha debe tener formato YYYY-MM-DD.");
  }
  return trimmed;
};

export class TasaCambioService {
  static async getTasasCambio(): Promise<TasaCambio[]> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = unwrapPayload(raw);
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.tasas_cambio)
        ? payload.tasas_cambio
        : [];

    return list.map(mapTasaCambio).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }

  static async getTasaCambioHoy(): Promise<TasaCambio | null> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/hoy`);
    const error = extractApiError(raw);

    if (error) {
      const lowered = error.toLowerCase();
      if (lowered.includes("no encontrado") || lowered.includes("not found")) {
        return null;
      }
      throw new Error(error);
    }

    const payload = unwrapPayload(raw);
    if (!payload || typeof payload !== "object") return null;

    return mapTasaCambio(payload);
  }

  static async getTasaCambioByFecha(fecha: string): Promise<TasaCambio | null> {
    const fechaNormalizada = normalizeFecha(fecha);
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(fechaNormalizada)}`,
    );
    const error = extractApiError(raw);

    if (error) {
      const lowered = error.toLowerCase();
      if (lowered.includes("no encontrado") || lowered.includes("not found")) {
        return null;
      }
      throw new Error(error);
    }

    const payload = unwrapPayload(raw);
    if (!payload || typeof payload !== "object") return null;

    return mapTasaCambio(payload);
  }

  static async createTasaCambio(
    request: TasaCambioCreateRequest,
  ): Promise<TasaCambio> {
    const payload: TasaCambioCreateRequest = {
      fecha: normalizeFecha(request.fecha),
      usd_a_eur: Number(request.usd_a_eur),
      usd_a_cup: Number(request.usd_a_cup),
    };

    if (!Number.isFinite(payload.usd_a_eur) || payload.usd_a_eur <= 0) {
      throw new Error("La tasa USD a EUR debe ser mayor que 0.");
    }

    if (!Number.isFinite(payload.usd_a_cup) || payload.usd_a_cup <= 0) {
      throw new Error("La tasa USD a CUP debe ser mayor que 0.");
    }

    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapTasaCambio(unwrapPayload(raw));
  }

  static async updateTasaCambioByFecha(
    fecha: string,
    request: Omit<TasaCambioCreateRequest, "fecha">,
  ): Promise<TasaCambio> {
    const fechaNormalizada = normalizeFecha(fecha);
    const payload = {
      usd_a_eur: Number(request.usd_a_eur),
      usd_a_cup: Number(request.usd_a_cup),
    };

    if (!Number.isFinite(payload.usd_a_eur) || payload.usd_a_eur <= 0) {
      throw new Error("La tasa USD a EUR debe ser mayor que 0.");
    }

    if (!Number.isFinite(payload.usd_a_cup) || payload.usd_a_cup <= 0) {
      throw new Error("La tasa USD a CUP debe ser mayor que 0.");
    }

    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(fechaNormalizada)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapTasaCambio(unwrapPayload(raw));
  }
}
