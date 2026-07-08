/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  CostoActualResponse,
  KardexCosto,
  KardexEntradaCreateData,
  KardexHistorialParams,
} from "../../../types/feats/kardex-costo/kardex-costo-types";

const BASE_ENDPOINT = "/kardex-costo";

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

const mapKardex = (raw: any): KardexCosto => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  material_id: String(raw?.material_id ?? ""),
  almacen_id: String(raw?.almacen_id ?? ""),
  fecha: String(raw?.fecha ?? ""),
  movimiento_id: typeof raw?.movimiento_id === "string" ? raw.movimiento_id : undefined,
  compra_id: typeof raw?.compra_id === "string" ? raw.compra_id : undefined,
  solicitud_entrada_id: typeof raw?.solicitud_entrada_id === "string" ? raw.solicitud_entrada_id : undefined,
  cantidad_anterior: Number(raw?.cantidad_anterior ?? 0),
  costo_anterior: Number(raw?.costo_anterior ?? 0),
  cantidad_entrada: Number(raw?.cantidad_entrada ?? 0),
  costo_entrada: Number(raw?.costo_entrada ?? 0),
  cantidad_nueva: Number(raw?.cantidad_nueva ?? 0),
  costo_nuevo: Number(raw?.costo_nuevo ?? 0),
  tipo: typeof raw?.tipo === "string" ? raw.tipo : undefined,
  pendiente_costeo: raw?.pendiente_costeo === true,
  regularizada_por: typeof raw?.regularizada_por === "string" ? raw.regularizada_por : undefined,
  registrado_por_ci: typeof raw?.registrado_por_ci === "string" ? raw.registrado_por_ci : undefined,
  nota: typeof raw?.nota === "string" ? raw.nota : undefined,
});

const buildQuery = (params: KardexHistorialParams | undefined): string => {
  if (!params) return "";
  const entries: string[] = [];
  if (params.material_id) entries.push(`material_id=${encodeURIComponent(params.material_id)}`);
  if (params.almacen_id) entries.push(`almacen_id=${encodeURIComponent(params.almacen_id)}`);
  if (params.skip != null) entries.push(`skip=${params.skip}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
};

export class KardexCostoService {
  static async getHistorial(params: KardexHistorialParams): Promise<KardexCosto[]> {
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/historial${buildQuery(params)}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.historial)
          ? payload.historial
          : [];
      return list.map(mapKardex);
    } catch {
      return [];
    }
  }

  static async getCostoActual(material_id: string, almacen_id: string): Promise<CostoActualResponse | null> {
    if (!material_id.trim() || !almacen_id.trim()) return null;
    try {
      const query = `?material_id=${encodeURIComponent(material_id)}&almacen_id=${encodeURIComponent(almacen_id)}`;
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/costo-actual${query}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      if (!payload || typeof payload !== "object") return null;
      const costo = payload.costo_actual;
      return {
        material_id: String(payload.material_id ?? material_id),
        almacen_id: String(payload.almacen_id ?? almacen_id),
        costo_actual: costo == null ? null : Number(costo),
      };
    } catch {
      return null;
    }
  }

  static async getHistorialPorCompra(compra_id: string): Promise<KardexCosto[]> {
    if (!compra_id.trim()) return [];
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/compra/${encodeURIComponent(compra_id)}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.historial) ? payload.historial : [];
      return list.map(mapKardex);
    } catch {
      return [];
    }
  }

  static async crearEntrada(payload: KardexEntradaCreateData): Promise<KardexCosto> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/entrada`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapKardex(unwrapPayload(raw));
  }

  /**
   * Saldo inicial: crea la fila de apertura del kardex por almacén
   * (cantidad = stock real, costo = indicado) y sincroniza el catálogo.
   * Vía correcta para sembrar el costo de materiales con stock pero sin kardex.
   */
  static async saldoInicial(
    items: { material_id: string; costo: number; motivo?: string }[],
    dryRun = false,
  ): Promise<any> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/saldo-inicial`, {
      method: "POST",
      body: JSON.stringify({ items, dry_run: dryRun }),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return unwrapPayload(raw);
  }

  /**
   * Ajuste de costo: corrige el costo de materiales que YA tienen kardex
   * (crea filas ajuste_costo en todos sus almacenes) y sincroniza el catálogo.
   */
  static async ajusteCosto(
    items: { material_id: string; costo: number; motivo?: string }[],
    dryRun = false,
  ): Promise<any> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/ajuste-costo`, {
      method: "POST",
      body: JSON.stringify({ items, dry_run: dryRun }),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return unwrapPayload(raw);
  }
}
