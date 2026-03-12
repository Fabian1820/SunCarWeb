/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  MaterialVentaWeb,
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaListParams,
  SolicitudVentaMaterialItem,
  SolicitudVentaUpdateData,
} from "../../../api-types";

const BASE_ENDPOINT = "/operaciones/solicitudes-ventas";
const buildDetailEndpoint = (id: string) =>
  `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;

const asString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const extractApiError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "La operacion no pudo completarse"
    );
  }
  if (response?.error?.message && !response?.id) {
    return response.error.message;
  }
  return null;
};

const normalizeMaterialesPayload = (
  materiales: SolicitudVentaMaterialItem[],
): SolicitudVentaMaterialItem[] => {
  const merged = new Map<string, number>();

  for (const item of materiales) {
    const materialId = asString(item.material_id);
    const cantidad = asNumber(item.cantidad) ?? 0;
    if (!materialId || cantidad <= 0) continue;
    merged.set(materialId, (merged.get(materialId) ?? 0) + cantidad);
  }

  return Array.from(merged.entries()).map(([material_id, cantidad]) => ({
    material_id,
    cantidad,
  }));
};

const normalizeMaterialVenta = (
  raw: unknown,
  categoriaFallback?: string,
): MaterialVentaWeb | null => {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const id =
    asString(row.id) ||
    asString(row._id) ||
    asString(row.material_id) ||
    asString(row.materialId);

  if (!id) return null;

  const codigo = asString(row.codigo) || id;
  const nombre =
    asString(row.nombre) ||
    asString(row.descripcion) ||
    asString(row.material_descripcion) ||
    codigo;

  const habilitarVentaWeb =
    typeof row.habilitar_venta_web === "boolean"
      ? row.habilitar_venta_web
      : undefined;

  if (habilitarVentaWeb === false) return null;

  return {
    id,
    codigo,
    nombre,
    descripcion:
      asString(row.descripcion) || asString(row.material_descripcion) || nombre,
    um: asString(row.um),
    foto: asString(row.foto),
    precio: asNumber(row.precio),
    habilitar_venta_web: habilitarVentaWeb,
    categoria: asString(row.categoria) || categoriaFallback,
  };
};

const flattenVendibles = (payload: unknown): MaterialVentaWeb[] => {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).materiales as
          | unknown[]
          | undefined)
      : undefined;

  if (!rows || rows.length === 0) return [];

  const normalized: MaterialVentaWeb[] = [];

  for (const item of rows) {
    if (
      item &&
      typeof item === "object" &&
      Array.isArray((item as Record<string, unknown>).materiales)
    ) {
      const categoria = asString((item as Record<string, unknown>).categoria);
      const materiales = (item as Record<string, unknown>)
        .materiales as unknown[];
      for (const material of materiales) {
        const parsed = normalizeMaterialVenta(material, categoria);
        if (parsed) normalized.push(parsed);
      }
      continue;
    }

    const parsed = normalizeMaterialVenta(item);
    if (parsed) normalized.push(parsed);
  }

  const dedup = new Map<string, MaterialVentaWeb>();
  for (const material of normalized) {
    if (!dedup.has(material.id)) {
      dedup.set(material.id, material);
      continue;
    }

    const current = dedup.get(material.id)!;
    dedup.set(material.id, {
      ...current,
      ...material,
      descripcion: material.descripcion || current.descripcion,
      um: material.um || current.um,
      foto: material.foto || current.foto,
      precio: material.precio ?? current.precio,
      categoria: material.categoria || current.categoria,
    });
  }

  return Array.from(dedup.values());
};

export class SolicitudVentaService {
  static async getMaterialesVendiblesWeb(): Promise<MaterialVentaWeb[]> {
    try {
      const primary = await apiRequest<any>("/productos/materiales-web");
      const primaryError = extractApiError(primary);

      if (!primaryError) {
        const payload = primary?.data ?? primary;
        const materials = flattenVendibles(payload);
        if (materials.length > 0) {
          return materials;
        }
      }
    } catch (error) {
      console.warn(
        "[SolicitudVentaService] Fallback a /productos/catalogo-web tras fallo en /productos/materiales-web",
        error,
      );
    }

    const fallback = await apiRequest<any>("/productos/catalogo-web");
    const fallbackError = extractApiError(fallback);
    if (fallbackError) throw new Error(fallbackError);

    const fallbackPayload = fallback?.data ?? fallback;
    return flattenVendibles(fallbackPayload);
  }

  static async getSolicitudes(
    params: SolicitudVentaListParams = {},
  ): Promise<SolicitudVenta[]> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.cliente_venta_numero) {
      search.append("cliente_venta_numero", params.cliente_venta_numero);
    }
    if (params.almacen_id) search.append("almacen_id", params.almacen_id);
    if (params.trabajador_id) {
      search.append("trabajador_id", params.trabajador_id);
    }
    if (params.codigo) search.append("codigo", params.codigo);
    if (params.estado) search.append("estado", params.estado);

    const endpoint = search.toString()
      ? `${BASE_ENDPOINT}/?${search.toString()}`
      : `${BASE_ENDPOINT}/`;

    const raw = await apiRequest<any>(endpoint);
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload;
    return payload?.solicitudes || payload?.data || [];
  }

  static async getSolicitudById(id: string): Promise<SolicitudVenta | null> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id));
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return (raw?.data ?? raw) as SolicitudVenta;
  }

  static async createSolicitud(
    data: SolicitudVentaCreateData,
  ): Promise<SolicitudVenta> {
    const payload: SolicitudVentaCreateData = {
      ...data,
      cliente_venta: {
        ...data.cliente_venta,
        nombre: data.cliente_venta.nombre.trim(),
      },
      materiales: normalizeMaterialesPayload(data.materiales),
    };

    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return (raw?.data ?? raw) as SolicitudVenta;
  }

  static async putSolicitud(
    id: string,
    data: SolicitudVentaUpdateData,
  ): Promise<SolicitudVenta> {
    const payload: SolicitudVentaUpdateData = {
      ...data,
      cliente_venta: data.cliente_venta
        ? {
            ...data.cliente_venta,
            nombre: data.cliente_venta.nombre?.trim(),
          }
        : undefined,
      materiales: data.materiales
        ? normalizeMaterialesPayload(data.materiales)
        : undefined,
    };

    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return (raw?.data ?? raw) as SolicitudVenta;
  }

  static async patchSolicitud(
    id: string,
    data: SolicitudVentaUpdateData,
  ): Promise<SolicitudVenta> {
    const payload: SolicitudVentaUpdateData = {
      ...data,
      cliente_venta: data.cliente_venta
        ? {
            ...data.cliente_venta,
            nombre: data.cliente_venta.nombre?.trim(),
          }
        : undefined,
      materiales: data.materiales
        ? normalizeMaterialesPayload(data.materiales)
        : undefined,
    };

    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return (raw?.data ?? raw) as SolicitudVenta;
  }

  static async deleteSolicitud(
    id: string,
  ): Promise<{ success?: boolean; message?: string }> {
    const raw = await apiRequest<any>(buildDetailEndpoint(id), {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);

    return (raw?.data ?? raw) as { success?: boolean; message?: string };
  }
}
