/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type { Sede, SedeUpsertRequest } from "../../../types/feats/sedes/sede-types";
import { ensureValidObjectId } from "../../../utils/object-id";

const BASE_ENDPOINT = "/sedes";
const COLLECTION_ENDPOINT = "/sedes/";

const extractApiError = (response: any): string | null => {
  if (!response) return null;

  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación de sedes."
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

const mapSede = (raw: any): Sede => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  tipo: String(raw?.tipo ?? "nacional"),
  provincia_codigo: raw?.provincia_codigo ?? null,
  provincia_nombre: raw?.provincia_nombre ?? null,
  activo: Boolean(raw?.activo ?? true),
});

const normalizeSedePayload = (payload: SedeUpsertRequest): SedeUpsertRequest => {
  const tipo = payload.tipo;
  const base: SedeUpsertRequest = {
    nombre: payload.nombre.trim(),
    tipo,
    activo: payload.activo ?? true,
  };

  if (tipo === "provincial") {
    base.provincia_codigo = payload.provincia_codigo?.trim() || null;
    base.provincia_nombre = payload.provincia_nombre?.trim() || null;
  } else {
    base.provincia_codigo = null;
    base.provincia_nombre = null;
  }

  return base;
};

export class SedeService {
  static async getSedes(activo?: boolean): Promise<Sede[]> {
    const query =
      typeof activo === "boolean" ? `?activo=${activo ? "true" : "false"}` : "";

    // Evita redirect automático (307) de FastAPI de /sedes a /sedes/, que en
    // despliegues detrás de proxy puede devolver Location en http.
    const raw = await apiRequest<any>(`${COLLECTION_ENDPOINT}${query}`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = unwrapPayload(raw);
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.sedes)
        ? payload.sedes
        : [];

    return list.map(mapSede);
  }

  static async getSedeById(sedeId: string): Promise<Sede | null> {
    const safeId = ensureValidObjectId(sedeId, "sede_id");
    if (!safeId) return null;

    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`,
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
    return mapSede(payload);
  }

  static async createSede(data: SedeUpsertRequest): Promise<Sede> {
    const normalized = normalizeSedePayload(data);
    if (!normalized.nombre) {
      throw new Error("El nombre de la sede es obligatorio.");
    }
    if (normalized.tipo === "provincial" && !normalized.provincia_codigo) {
      throw new Error(
        "La provincia es obligatoria cuando el tipo de sede es provincial.",
      );
    }

    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapSede(unwrapPayload(raw));
  }

  static async updateSede(sedeId: string, data: SedeUpsertRequest): Promise<Sede> {
    const safeId = ensureValidObjectId(sedeId, "sede_id");
    if (!safeId) {
      throw new Error("sede_id inválido.");
    }

    const normalized = normalizeSedePayload(data);
    if (!normalized.nombre) {
      throw new Error("El nombre de la sede es obligatorio.");
    }
    if (normalized.tipo === "provincial" && !normalized.provincia_codigo) {
      throw new Error(
        "La provincia es obligatoria cuando el tipo de sede es provincial.",
      );
    }

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`, {
      method: "PUT",
      body: JSON.stringify(normalized),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapSede(unwrapPayload(raw));
  }

  static async deleteSede(sedeId: string): Promise<void> {
    const safeId = ensureValidObjectId(sedeId, "sede_id");
    if (!safeId) {
      throw new Error("sede_id inválido.");
    }

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`, {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }
}
