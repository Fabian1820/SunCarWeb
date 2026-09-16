/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "@/lib/api-config";
import { ensureValidObjectId } from "@/lib/utils/object-id";
import type {
  ContabilidadResumen,
  PersonaCategoria,
  PersonaCategoriaUpsertRequest,
} from "@/lib/types/feats/informe-direccion/contabilidad-types";

const RESUMEN_ENDPOINT = "/informe-direccion/contabilidad";
const BASE_ENDPOINT = "/informe-direccion/contabilidad/personas-categoria";
const COLLECTION_ENDPOINT = "/informe-direccion/contabilidad/personas-categoria/";

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación de Contabilidad."
    );
  }
  if (response?.error?.message) return response.error.message;
  return null;
};

const unwrapPayload = (response: any): any =>
  response?.data !== undefined ? response.data : response;

const mapPersonaCategoria = (raw: any): PersonaCategoria => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  persona_ci: raw?.persona_ci ?? null,
  persona_nombre: String(raw?.persona_nombre ?? ""),
  categoria: raw?.categoria,
  activo: Boolean(raw?.activo ?? true),
});

export const ContabilidadFinancieraService = {
  async obtenerResumen(desde: string, hasta: string): Promise<ContabilidadResumen> {
    const query = new URLSearchParams({ desde, hasta });
    return apiRequest<ContabilidadResumen>(`${RESUMEN_ENDPOINT}?${query.toString()}`);
  },
};

export class PersonaCategoriaService {
  static async getAll(): Promise<PersonaCategoria[]> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = unwrapPayload(raw);
    const list = Array.isArray(payload) ? payload : [];
    return list.map(mapPersonaCategoria);
  }

  static async create(data: PersonaCategoriaUpsertRequest): Promise<string> {
    if (!data.persona_nombre.trim()) {
      throw new Error("El nombre de la persona es obligatorio.");
    }
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return String(raw?.persona_categoria_id ?? "");
  }

  static async update(id: string, data: Partial<PersonaCategoriaUpsertRequest>): Promise<void> {
    const safeId = ensureValidObjectId(id, "persona_categoria_id");
    if (!safeId) throw new Error("persona_categoria_id inválido.");

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }

  static async delete(id: string): Promise<void> {
    const safeId = ensureValidObjectId(id, "persona_categoria_id");
    if (!safeId) throw new Error("persona_categoria_id inválido.");

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(safeId)}`, {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }
}
