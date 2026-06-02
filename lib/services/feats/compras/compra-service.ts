/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  AplicarPreciosMaterialPayload,
  ArchivoCompra,
  CancelarCompraRequest,
  Compra,
  CompraCreateData,
  CompraMaterial,
  DatosMaritimo,
  EstadoCompra,
  FichaPatchRequest,
  MaterialDatosBulk,
  PonderarCostoRequest,
  PonderarCostoResponse,
  StockMaterialCompra,
  TipoCompra,
  TipoContenedor,
} from "../../../types/feats/compras/compra-types";

const BASE_ENDPOINT = "/compras";
const COLLECTION_ENDPOINT = "/compras/";

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

// Nombres canónicos actuales del backend. Se mantiene mapeo defensivo desde
// los nombres viejos (borrador / en_transito / recibida_completa / cerrada_con_ajuste)
// por si quedan compras en BD sin migrar — el backend normaliza en escritura
// pero podría devolverlos en alguna lectura legacy.
const normalizeEstado = (raw: any): EstadoCompra => {
  const value = String(raw || "").toLowerCase();
  // Nombres nuevos
  if (value === "solicitado") return "solicitado";
  if (value === "enviado") return "enviado";
  if (value === "arribado") return "arribado";
  if (value === "recibido_parcial") return "recibido_parcial";
  if (value === "recibido") return "recibido";
  if (value === "cancelado") return "cancelado";
  // Compat con nombres viejos
  if (value === "borrador") return "solicitado";
  if (value === "en_transito") return "enviado";
  if (value === "recibida_parcial") return "recibido_parcial";
  if (value === "recibida_completa") return "recibido";
  if (value === "cerrada_con_ajuste") return "cancelado";
  return "solicitado";
};

const normalizeTipo = (raw: any): TipoCompra => {
  const value = String(raw || "").toLowerCase();
  if (value === "maritimo") return "maritimo";
  if (value === "aereo") return "aereo";
  if (value === "local") return "local";
  return "otro";
};

const normalizeTipoContenedor = (raw: any): TipoContenedor | undefined => {
  if (raw === "20DV" || raw === "40DV" || raw === "40HC") return raw;
  return undefined;
};

const mapArchivo = (raw: any): ArchivoCompra => ({
  id: String(raw?.id ?? ""),
  url: String(raw?.url ?? ""),
  tipo: (["imagen", "video", "audio", "documento"].includes(raw?.tipo) ? raw.tipo : "documento") as ArchivoCompra["tipo"],
  nombre: String(raw?.nombre ?? ""),
  tamano: Number(raw?.tamano ?? 0),
  mime_type: String(raw?.mime_type ?? ""),
  created_at: String(raw?.created_at ?? ""),
});

const mapMaterial = (raw: any): CompraMaterial => ({
  material_id: String(raw?.material_id ?? raw?.id ?? ""),
  material_codigo: String(raw?.material_codigo ?? raw?.codigo ?? ""),
  material_nombre: String(raw?.material_nombre ?? raw?.nombre ?? raw?.descripcion ?? ""),
  cantidad: Number(raw?.cantidad ?? 0),
  precio_unitario_cif: Number(raw?.precio_unitario_cif ?? 0),
  porciento_recargo: Number(raw?.porciento_recargo ?? 0),
  costo: Number(raw?.costo ?? 0),
  precios_aplicados: raw?.precios_aplicados === true,
  precio_venta_sugerido: raw?.precio_venta_sugerido != null ? Number(raw.precio_venta_sugerido) : null,
  precio_instaladora_sugerido: raw?.precio_instaladora_sugerido != null ? Number(raw.precio_instaladora_sugerido) : null,
  precio_venta_final: raw?.precio_venta_final != null ? Number(raw.precio_venta_final) : null,
  precio_instaladora_final: raw?.precio_instaladora_final != null ? Number(raw.precio_instaladora_final) : null,
  porciento_rebajable_venta: Number(raw?.porciento_rebajable_venta ?? 0),
  cantidad_entrada_aprobada: Number(raw?.cantidad_entrada_aprobada ?? 0),
  cantidad_ajuste_cierre: Number(raw?.cantidad_ajuste_cierre ?? 0),
  motivo_ajuste_cierre: typeof raw?.motivo_ajuste_cierre === "string" ? raw.motivo_ajuste_cierre : undefined,
});

const mapDatosMaritimo = (raw: any): DatosMaritimo | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    bl: raw?.bl ?? undefined,
    referencia_buque: raw?.referencia_buque ?? undefined,
    sello: raw?.sello ?? undefined,
    buque: raw?.buque ?? undefined,
    tipo_contenedor: normalizeTipoContenedor(raw?.tipo_contenedor),
    puerto_origen: raw?.puerto_origen ?? undefined,
    pais_origen: raw?.pais_origen ?? undefined,
    puerto_destino: raw?.puerto_destino ?? undefined,
    transitaria: raw?.transitaria ?? undefined,
  };
};

const mapCompra = (raw: any): Compra => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  nombre: String(raw?.nombre ?? ""),
  descripcion: typeof raw?.descripcion === "string" ? raw.descripcion : "",
  tipo: normalizeTipo(raw?.tipo),
  proveedor: raw?.proveedor ?? undefined,
  cliente: raw?.cliente ?? undefined,
  fecha_envio: String(raw?.fecha_envio ?? ""),
  fecha_llegada_aproximada: String(raw?.fecha_llegada_aproximada ?? ""),
  estado: normalizeEstado(raw?.estado),
  pagado: Boolean(raw?.pagado ?? false),
  datos_maritimo: mapDatosMaritimo(raw?.datos_maritimo),
  costos: Array.isArray(raw?.costos)
    ? raw.costos.map((c: any) => ({
        descripcion: String(c?.descripcion ?? ""),
        monto: Number(c?.monto ?? 0),
        moneda: (["USD", "EUR", "MLC", "CUP"].includes(c?.moneda) ? c.moneda : "USD") as any,
      }))
    : [],
  total_costos: raw?.total_costos != null ? Number(raw.total_costos) : undefined,
  valor_mercancia: raw?.valor_mercancia != null ? Number(raw.valor_mercancia) : undefined,
  tasa_conversion_eur_usd: raw?.tasa_conversion_eur_usd != null ? Number(raw.tasa_conversion_eur_usd) : null,
  tasa_conversion_mlc_usd: raw?.tasa_conversion_mlc_usd != null ? Number(raw.tasa_conversion_mlc_usd) : null,
  tasa_conversion_cup_usd: raw?.tasa_conversion_cup_usd != null ? Number(raw.tasa_conversion_cup_usd) : null,
  porciento_cargo_envio_sugerido: raw?.porciento_cargo_envio_sugerido != null ? Number(raw.porciento_cargo_envio_sugerido) : undefined,
  porciento_cargo_envio_impuestos: raw?.porciento_cargo_envio_impuestos != null ? Number(raw.porciento_cargo_envio_impuestos) : undefined,
  porciento_instaladora: Number(raw?.porciento_instaladora ?? 0),
  porciento_ventas: Number(raw?.porciento_ventas ?? 0),
  materiales: Array.isArray(raw?.materiales) ? raw.materiales.map(mapMaterial) : [],
  archivos: Array.isArray(raw?.archivos) ? raw.archivos.map(mapArchivo) : [],
  motivo_cancelacion: typeof raw?.motivo_cancelacion === "string" ? raw.motivo_cancelacion : undefined,
  motivo_cierre_ajuste: typeof raw?.motivo_cierre_ajuste === "string" ? raw.motivo_cierre_ajuste : undefined,
  created_at: typeof raw?.created_at === "string" ? raw.created_at : undefined,
  updated_at: typeof raw?.updated_at === "string" ? raw.updated_at : undefined,
  deleted: Boolean(raw?.deleted ?? false),
});

export interface ListComprasParams {
  q?: string;
  estado?: EstadoCompra;
  tipo?: TipoCompra;
  skip?: number;
  limit?: number;
}

const buildQuery = (params: ListComprasParams | undefined): string => {
  if (!params) return "";
  const entries: string[] = [];
  if (params.q) entries.push(`q=${encodeURIComponent(params.q)}`);
  if (params.estado) entries.push(`estado=${encodeURIComponent(params.estado)}`);
  if (params.tipo) entries.push(`tipo=${encodeURIComponent(params.tipo)}`);
  if (params.skip != null) entries.push(`skip=${params.skip}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
};

export class CompraService {
  static async getCompras(params?: ListComprasParams): Promise<Compra[]> {
    try {
      const raw = await apiRequest<any>(`${COLLECTION_ENDPOINT}${buildQuery(params)}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.compras)
          ? payload.compras
          : [];
      return list.map(mapCompra);
    } catch {
      return [];
    }
  }

  static async createCompra(data: CompraCreateData): Promise<Compra> {
    const raw = await apiRequest<any>(COLLECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapCompra(unwrapPayload(raw));
  }

  static async getCompraById(compraId: string): Promise<Compra | null> {
    if (!compraId.trim()) return null;
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(compraId.trim())}`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = unwrapPayload(raw);
      if (!payload || typeof payload !== "object") return null;
      return mapCompra(payload);
    } catch {
      return null;
    }
  }

  static async updateCompra(compraId: string, data: Partial<CompraCreateData>): Promise<Compra> {
    // El backend acepta cambios de estado entre los estados manuales
    // (solicitado / enviado / arribado). Los estados terminales son
    // automáticos: recibido y recibido_parcial los marca el backend al
    // aprobar solicitudes; cancelado va por POST /cancelar.
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(compraId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapCompra(unwrapPayload(raw));
  }

  static async deleteCompra(compraId: string): Promise<void> {
    const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(compraId)}`, {
      method: "DELETE",
    });
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }

  static async cancelarCompra(compraId: string, payload: CancelarCompraRequest = {}): Promise<Compra> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/cancelar`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapCompra(unwrapPayload(raw));
  }

  static async guardarFicha(compraId: string, payload: FichaPatchRequest): Promise<Compra> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/ficha`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapCompra(unwrapPayload(raw));
  }

  static async ponderarCosto(
    compraId: string,
    payload: PonderarCostoRequest = {},
  ): Promise<PonderarCostoResponse> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/ponderar-costo`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const data = unwrapPayload(raw) ?? {};
    return {
      actualizados: Number(data?.actualizados ?? 0),
      kardex_recalculados: Array.isArray(data?.kardex_recalculados)
        ? data.kardex_recalculados.map(String)
        : [],
    };
  }

  static async getStockMateriales(compraId: string): Promise<StockMaterialCompra[]> {
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/stock-materiales`);
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

  static async getMaterialesDatosBulk(
    materialIds: string[],
  ): Promise<Record<string, MaterialDatosBulk>> {
    if (materialIds.length === 0) return {};
    try {
      const raw = await apiRequest<any>("/productos/materiales/bulk-datos", {
        method: "POST",
        body: JSON.stringify({ material_ids: materialIds }),
      });
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const payload = raw?.data ?? {};
      const result: Record<string, MaterialDatosBulk> = {};
      for (const [mid, item] of Object.entries(payload as Record<string, any>)) {
        result[mid] = {
          precio: Number(item?.precio ?? 0),
          precio_instaladora: Number(item?.precio_instaladora ?? 0),
          costo: Number(item?.costo ?? 0),
          stock_total: Number(item?.stock_total ?? 0),
          porciento_rebajable_venta: item?.porciento_rebajable_venta != null ? Number(item.porciento_rebajable_venta) : undefined,
        };
      }
      return result;
    } catch {
      return {};
    }
  }

  static async aplicarPrecios(
    compraId: string,
    materiales: AplicarPreciosMaterialPayload[],
  ): Promise<Compra> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/aplicar-precios`,
      {
        method: "POST",
        body: JSON.stringify({ materiales }),
      },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    return mapCompra(unwrapPayload(raw));
  }

  static async uploadArchivos(compraId: string, files: File[]): Promise<ArchivoCompra[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append("archivos", f));
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/archivos`,
      { method: "POST", body: formData },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
    const list = raw?.archivos ?? [];
    return Array.isArray(list) ? list.map(mapArchivo) : [];
  }

  static async getArchivos(compraId: string): Promise<ArchivoCompra[]> {
    try {
      const raw = await apiRequest<any>(`${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/archivos`);
      const error = extractApiError(raw);
      if (error) throw new Error(error);
      const list = raw?.data ?? [];
      return Array.isArray(list) ? list.map(mapArchivo) : [];
    } catch {
      return [];
    }
  }

  static async deleteArchivo(compraId: string, archivoId: string): Promise<void> {
    const raw = await apiRequest<any>(
      `${BASE_ENDPOINT}/${encodeURIComponent(compraId)}/archivos/${encodeURIComponent(archivoId)}`,
      { method: "DELETE" },
    );
    const error = extractApiError(raw);
    if (error) throw new Error(error);
  }
}
