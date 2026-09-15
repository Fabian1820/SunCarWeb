/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  Organigrama,
  OrganigramaUpsertRequest,
} from "../../../types/feats/organigramas/organigrama-types";
import { normalizarNodo } from "./organigrama-arbol";

// Con barra final: evita el 307 de FastAPI, que detrás del proxy puede
// publicar el Location en http.
const COLLECTION_ENDPOINT = "/organigramas/";
const BASE_ENDPOINT = "/organigramas";

const desempaquetar = (raw: any, porDefecto: string): any => {
  if (raw?.success === false) {
    throw new Error(raw?.message || raw?.detail || porDefecto);
  }
  return raw?.data !== undefined ? raw.data : raw;
};

const mapOrganigrama = (raw: any): Organigrama => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  descripcion: raw?.descripcion ?? null,
  raiz: normalizarNodo(raw?.raiz),
  creado_en: raw?.creado_en ?? null,
  actualizado_en: raw?.actualizado_en ?? null,
  creado_por: raw?.creado_por ?? null,
  actualizado_por: raw?.actualizado_por ?? null,
});

const rutaDe = (id: string) => `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;

export class OrganigramaService {
  static async getOrganigramas(): Promise<Organigrama[]> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT);
    const data = desempaquetar(raw, "No se pudieron cargar los organigramas.");
    return Array.isArray(data) ? data.map(mapOrganigrama) : [];
  }

  static async getOrganigrama(id: string): Promise<Organigrama> {
    const raw = await apiRequest<any>(rutaDe(id));
    return mapOrganigrama(desempaquetar(raw, "No se pudo cargar el organigrama."));
  }

  static async createOrganigrama(data: OrganigramaUpsertRequest): Promise<Organigrama> {
    const nombre = data.nombre.trim();
    if (!nombre) throw new Error("El nombre del organigrama es obligatorio.");
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ ...data, nombre }),
    });
    return mapOrganigrama(desempaquetar(raw, "No se pudo crear el organigrama."));
  }

  static async updateOrganigrama(
    id: string,
    data: Required<Pick<OrganigramaUpsertRequest, "nombre" | "raiz">> &
      Pick<OrganigramaUpsertRequest, "descripcion">,
  ): Promise<Organigrama> {
    const nombre = data.nombre.trim();
    if (!nombre) throw new Error("El nombre del organigrama es obligatorio.");
    const raw = await apiRequest<any>(rutaDe(id), {
      method: "PUT",
      body: JSON.stringify({ ...data, nombre }),
    });
    return mapOrganigrama(desempaquetar(raw, "No se pudo guardar el organigrama."));
  }

  static async duplicarOrganigrama(id: string): Promise<Organigrama> {
    const raw = await apiRequest<any>(`${rutaDe(id)}/duplicar`, { method: "POST" });
    return mapOrganigrama(desempaquetar(raw, "No se pudo duplicar el organigrama."));
  }

  static async deleteOrganigrama(id: string): Promise<void> {
    const raw = await apiRequest<any>(rutaDe(id), { method: "DELETE" });
    desempaquetar(raw, "No se pudo eliminar el organigrama.");
  }
}
