/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  Departamento,
  DepartamentoUpsertRequest,
} from "../../../types/feats/departamentos/departamento-types";
import { ensureValidObjectId } from "../../../utils/object-id";

const BASE_ENDPOINT = "/departamentos";

const extractApiError = (response: any): string | null => {
  if (!response) return null;

  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación de departamentos."
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

const mapDepartamento = (raw: any): Departamento => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  activo: Boolean(raw?.activo ?? true),
});

const normalizeDepartamentoPayload = (
  payload: DepartamentoUpsertRequest,
): DepartamentoUpsertRequest => ({
  nombre: payload.nombre.trim(),
  activo: payload.activo ?? true,
});

export class DepartamentoService {
  static async getDepartamentos(activo?: boolean): Promise<Departamento[]> {
    const query =
      typeof activo === "boolean" ? `?activo=${activo ? "true" : "false"}` : "";

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}${query}`);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = unwrapPayload(raw);
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.departamentos)
        ? payload.departamentos
        : [];

    return list.map(mapDepartamento);
  }

  static async getDepartamentoById(departamentoId: string): Promise<Departamento | null> {
    const safeId = ensureValidObjectId(departamentoId, "departamento_id");
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
    return mapDepartamento(payload);
  }

  static async createDepartamento(
    data: DepartamentoUpsertRequest,
  ): Promise<Departamento> {
    const normalized = normalizeDepartamentoPayload(data);
    if (!normalized.nombre) {
      throw new Error("El nombre del departamento es obligatorio.");
    }

    const raw = await apiRequest<any>(BASE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapDepartamento(unwrapPayload(raw));
  }

  static async updateDepartamento(
    departamentoId: string,
    data: DepartamentoUpsertRequest,
  ): Promise<Departamento> {
    const safeId = ensureValidObjectId(departamentoId, "departamento_id");
    if (!safeId) {
      throw new Error("departamento_id inválido.");
    }

    const normalized = normalizeDepartamentoPayload(data);
    if (!normalized.nombre) {
      throw new Error("El nombre del departamento es obligatorio.");
    }

    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`,
      {
        method: "PUT",
        body: JSON.stringify(normalized),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return mapDepartamento(unwrapPayload(raw));
  }

  static async deleteDepartamento(departamentoId: string): Promise<void> {
    const safeId = ensureValidObjectId(departamentoId, "departamento_id");
    if (!safeId) {
      throw new Error("departamento_id inválido.");
    }

    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`,
      {
        method: "DELETE",
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }
}
