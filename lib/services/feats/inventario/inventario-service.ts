/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import { MaterialService } from "../materials/material-service";
import type {
  Almacen,
  AlmacenInfo,
  AlmacenCreateData,
  AlmacenUpdateData,
  InventarioMovimientoTipo,
  Tienda,
  TiendaCreateData,
  TiendaUpdateData,
  StockItem,
  MovimientoInventario,
  MovimientoCreateData,
  MovimientoLoteCreateData,
  MovimientoLoteResponse,
  MovimientoLoteResumenPorMaterial,
  VentaCreateData,
} from "../../../inventario-types";

const MOVIMIENTO_TIPOS: InventarioMovimientoTipo[] = [
  "entrada",
  "salida",
  "transferencia",
  "ajuste",
  "eliminacion",
  "venta",
];

const asString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
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

const normalizeCode = (value: string): string => value.trim().toLowerCase();

const resolveEntityId = (entity: unknown): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;
  const row = entity as Record<string, unknown>;
  return asString(
    row.id ?? row._id ?? row.material_id ?? row.almacen_id ?? row.tienda_id,
  );
};

const isMovimientoTipo = (
  value: unknown,
): value is InventarioMovimientoTipo => {
  return (
    typeof value === "string" &&
    MOVIMIENTO_TIPOS.includes(value as InventarioMovimientoTipo)
  );
};

const extractArray = <T>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (response?.data) {
    return Array.isArray(response.data) ? response.data : [response.data];
  }
  return [];
};

const extractItem = <T>(response: any): T => {
  if (response?.data) return response.data as T;
  return response as T;
};

export class InventarioService {
  private static materialIdByCode = new Map<string, string>();
  private static materialCacheLoaded = false;

  private static cacheMaterialCode(
    materialCodigo?: string,
    materialId?: string,
  ): void {
    const codigo = materialCodigo ? normalizeCode(materialCodigo) : "";
    const id = asString(materialId);
    if (!codigo || !id) return;
    this.materialIdByCode.set(codigo, id);
  }

  private static async ensureMaterialCodeCache(): Promise<void> {
    if (this.materialCacheLoaded) return;

    const materiales = await MaterialService.getAllMaterials();
    for (const material of materiales) {
      const codigo = asString(material.codigo);
      const materialId = asString(material.id);
      this.cacheMaterialCode(codigo, materialId);
    }
    this.materialCacheLoaded = true;
  }

  private static async resolveMaterialId(
    data: MovimientoCreateData,
  ): Promise<string> {
    const explicitMaterialId = asString(data.material_id);
    if (explicitMaterialId) return explicitMaterialId;

    const materialCodigo = asString(data.material_codigo);
    if (!materialCodigo) {
      throw new Error(
        "Debes enviar material_id o material_codigo para registrar el movimiento",
      );
    }

    const cached = this.materialIdByCode.get(normalizeCode(materialCodigo));
    if (cached) return cached;

    await this.ensureMaterialCodeCache();
    const resolved = this.materialIdByCode.get(normalizeCode(materialCodigo));
    if (!resolved) {
      throw new Error(
        `No se pudo resolver material_id para el codigo ${materialCodigo}. Verifica que el material exista.`,
      );
    }
    return resolved;
  }

  private static normalizeAlmacen(raw: any): Almacen {
    return {
      ...raw,
      id: resolveEntityId(raw),
      nombre:
        asString(raw?.nombre) || asString(raw?.descripcion) || "Sin nombre",
    };
  }

  private static normalizeTienda(raw: any): Tienda {
    const rawAlmacenes = Array.isArray(raw?.almacenes) ? raw.almacenes : [];
    const almacenes: AlmacenInfo[] = rawAlmacenes
      .map((item: any) => {
        const id = resolveEntityId(item);
        if (!id) return null;
        return {
          id,
          nombre:
            asString(item?.nombre) || asString(item?.almacen_nombre) || id,
        };
      })
      .filter((item: AlmacenInfo | null): item is AlmacenInfo => item !== null);

    const legacyAlmacenId = asString(raw?.almacen_id) || almacenes[0]?.id;
    const legacyAlmacenNombre =
      asString(raw?.almacen_nombre) || almacenes[0]?.nombre;

    return {
      ...raw,
      id: resolveEntityId(raw),
      nombre:
        asString(raw?.nombre) || asString(raw?.descripcion) || "Sin nombre",
      almacenes,
      almacen_id: legacyAlmacenId,
      almacen_nombre: legacyAlmacenNombre,
    };
  }

  private static mapStockRow(
    row: any,
    context: {
      almacenId?: string;
      almacenNombre?: string;
      almacen?: Record<string, unknown>;
    },
  ): StockItem | null {
    const materialObj =
      row?.material && typeof row.material === "object"
        ? (row.material as Record<string, unknown>)
        : undefined;

    const materialId =
      asString(row?.material_id) || resolveEntityId(materialObj);
    const materialCodigo =
      asString(row?.material_codigo) ||
      asString(materialObj?.codigo) ||
      asString(row?.codigo);

    if (!materialId && !materialCodigo) return null;

    const almacenId = context.almacenId || asString(row?.almacen_id) || "";
    const almacenNombre =
      context.almacenNombre ||
      asString(row?.almacen_nombre) ||
      asString((context.almacen as any)?.nombre);

    if (materialCodigo && materialId) {
      this.cacheMaterialCode(materialCodigo, materialId);
    }

    const fallbackId = [almacenId, materialId || materialCodigo]
      .filter((part): part is string => Boolean(part))
      .join("-");

    return {
      id: asString(row?.id) || asString(row?._id) || fallbackId || undefined,
      almacen_id: almacenId,
      almacen_nombre: almacenNombre,
      almacen: context.almacen,
      material_id: materialId,
      material_codigo: materialCodigo || materialId || "",
      material_descripcion:
        asString(row?.material_descripcion) ||
        asString(materialObj?.descripcion) ||
        asString(materialObj?.nombre),
      material: materialObj,
      categoria: asString(row?.categoria) || asString(materialObj?.categoria),
      um: asString(row?.um) || asString(materialObj?.um),
      cantidad: asNumber(row?.cantidad) ?? 0,
      actualizado_en:
        asString(row?.actualizado_en) || asString(row?.updated_at),
    };
  }

  private static normalizeStockResponse(response: any): StockItem[] {
    const rows = extractArray<any>(response);
    const normalized: StockItem[] = [];

    for (const row of rows) {
      const almacen =
        row?.almacen && typeof row.almacen === "object"
          ? (row.almacen as Record<string, unknown>)
          : undefined;
      const almacenId = asString(row?.almacen_id) || resolveEntityId(almacen);
      const almacenNombre =
        asString(row?.almacen_nombre) || asString((almacen as any)?.nombre);

      if (Array.isArray(row?.materiales)) {
        for (const materialRow of row.materiales) {
          const mapped = this.mapStockRow(materialRow, {
            almacenId,
            almacenNombre,
            almacen,
          });
          if (mapped) normalized.push(mapped);
        }
        continue;
      }

      const mapped = this.mapStockRow(row, {
        almacenId,
        almacenNombre,
        almacen,
      });
      if (mapped) normalized.push(mapped);
    }

    return normalized;
  }

  private static normalizeMovimiento(raw: any): MovimientoInventario {
    const material =
      raw?.material && typeof raw.material === "object"
        ? (raw.material as Record<string, unknown>)
        : undefined;
    const almacenOrigen =
      raw?.almacen_origen && typeof raw.almacen_origen === "object"
        ? (raw.almacen_origen as Record<string, unknown>)
        : undefined;
    const almacenDestino =
      raw?.almacen_destino && typeof raw.almacen_destino === "object"
        ? (raw.almacen_destino as Record<string, unknown>)
        : undefined;
    const tienda =
      raw?.tienda && typeof raw.tienda === "object"
        ? (raw.tienda as Record<string, unknown>)
        : undefined;

    const materialId = asString(raw?.material_id) || resolveEntityId(material);
    const materialCodigo =
      asString(raw?.material_codigo) ||
      asString(material?.codigo) ||
      materialId ||
      "";

    if (materialCodigo && materialId) {
      this.cacheMaterialCode(materialCodigo, materialId);
    }

    return {
      id: asString(raw?.id) || asString(raw?._id),
      tipo: isMovimientoTipo(raw?.tipo) ? raw.tipo : "entrada",
      material_id: materialId,
      material_codigo: materialCodigo,
      material_descripcion:
        asString(raw?.material_descripcion) ||
        asString(material?.descripcion) ||
        asString(material?.nombre),
      material,
      cantidad: asNumber(raw?.cantidad) ?? 0,
      um: asString(raw?.um) || asString(material?.um),
      almacen_origen_id:
        asString(raw?.almacen_origen_id) || resolveEntityId(almacenOrigen),
      almacen_origen_nombre:
        asString(raw?.almacen_origen_nombre) || asString(almacenOrigen?.nombre),
      almacen_destino_id:
        asString(raw?.almacen_destino_id) || resolveEntityId(almacenDestino),
      almacen_destino_nombre:
        asString(raw?.almacen_destino_nombre) ||
        asString(almacenDestino?.nombre),
      tienda_id: asString(raw?.tienda_id) || resolveEntityId(tienda),
      tienda_nombre: asString(raw?.tienda_nombre) || asString(tienda?.nombre),
      motivo: asString(raw?.motivo),
      referencia: asString(raw?.referencia),
      fecha:
        asString(raw?.fecha) ||
        asString(raw?.created_at) ||
        asString(raw?.fecha_movimiento),
      usuario:
        asString(raw?.usuario) ||
        asString(raw?.usuario_nombre) ||
        asString(raw?.created_by),
    };
  }

  private static normalizeMovimientosResponse(
    response: any,
  ): MovimientoInventario[] {
    return extractArray<any>(response).map((item) =>
      this.normalizeMovimiento(item),
    );
  }

  private static normalizeMovimientoLoteResumen(
    raw: any,
  ): MovimientoLoteResponse {
    const root =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const payload = extractItem<any>(root) || {};

    const resumenPayload =
      payload?.resumen && typeof payload.resumen === "object"
        ? payload.resumen
        : payload?.summary && typeof payload.summary === "object"
          ? payload.summary
          : root?.resumen && typeof root.resumen === "object"
            ? root.resumen
            : root?.summary && typeof root.summary === "object"
              ? root.summary
              : payload;

    const movimientosRaw = Array.isArray(payload?.movimientos)
      ? payload.movimientos
      : Array.isArray((resumenPayload as any)?.movimientos)
        ? (resumenPayload as any).movimientos
        : Array.isArray(root?.movimientos)
          ? root.movimientos
          : [];

    const porMaterialRaw = Array.isArray((resumenPayload as any)?.por_material)
      ? (resumenPayload as any).por_material
      : Array.isArray((resumenPayload as any)?.resumen_por_material)
        ? (resumenPayload as any).resumen_por_material
        : Array.isArray((resumenPayload as any)?.items)
          ? (resumenPayload as any).items
          : Array.isArray((resumenPayload as any)?.materiales)
            ? (resumenPayload as any).materiales
            : [];

    const porMaterialBase: MovimientoLoteResumenPorMaterial[] = porMaterialRaw
      .map((item: any) => {
        const materialCodigo =
          asString(item?.material_codigo) ||
          asString(item?.codigo) ||
          asString(item?.material_id) ||
          asString(item?.material?.codigo);
        if (!materialCodigo) return null;
        return {
          material_codigo: materialCodigo,
          cantidad: asNumber(item?.cantidad) ?? 0,
        };
      })
      .filter(
        (
          item: MovimientoLoteResumenPorMaterial | null,
        ): item is MovimientoLoteResumenPorMaterial => item !== null,
      );

    const porMaterial =
      porMaterialBase.length > 0
        ? porMaterialBase
        : (() => {
            const map = new Map<string, number>();
            for (const mov of movimientosRaw) {
              const materialCodigo =
                asString((mov as any)?.material_codigo) ||
                asString((mov as any)?.codigo) ||
                asString((mov as any)?.material_id) ||
                asString((mov as any)?.material?.codigo);
              if (!materialCodigo) continue;
              const qty = asNumber((mov as any)?.cantidad) ?? 0;
              map.set(materialCodigo, (map.get(materialCodigo) || 0) + qty);
            }
            return Array.from(map.entries()).map(
              ([material_codigo, cantidad]) => ({
                material_codigo,
                cantidad,
              }),
            );
          })();

    const totalMaterialesDistintos =
      asNumber((resumenPayload as any)?.total_materiales_distintos) ??
      asNumber((resumenPayload as any)?.total_materiales) ??
      asNumber((resumenPayload as any)?.materiales_distintos) ??
      porMaterial.length;
    const totalCantidad =
      asNumber((resumenPayload as any)?.total_cantidad) ??
      asNumber((resumenPayload as any)?.cantidad_total) ??
      asNumber((resumenPayload as any)?.total) ??
      porMaterial.reduce((acc, item) => acc + (item.cantidad || 0), 0);

    return {
      total_materiales_distintos: totalMaterialesDistintos,
      total_cantidad: totalCantidad,
      por_material: porMaterial,
    };
  }

  private static async resolveVentaAlmacenId(
    data: MovimientoCreateData,
  ): Promise<string> {
    const direct = asString(data.almacen_origen_id);
    if (direct) return direct;

    const tiendaId = asString(data.tienda_id);
    if (!tiendaId) {
      throw new Error("La venta requiere tienda_id");
    }

    const tiendas = await this.getTiendas();
    const tienda = tiendas.find((item) => item.id === tiendaId);
    const tiendaAlmacen = tienda?.almacen_id || tienda?.almacenes?.[0]?.id;
    if (!tiendaAlmacen) {
      throw new Error(
        "La tienda seleccionada no tiene un almacen valido para la venta",
      );
    }
    return tiendaAlmacen;
  }

  static async getAlmacenes(): Promise<Almacen[]> {
    const response = await apiRequest<any>("/almacenes/");
    return extractArray<any>(response).map((item) =>
      this.normalizeAlmacen(item),
    );
  }

  static async createAlmacen(data: AlmacenCreateData): Promise<Almacen> {
    const response = await apiRequest<any>("/almacenes/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return this.normalizeAlmacen(extractItem<any>(response));
  }

  static async updateAlmacen(
    id: string,
    data: AlmacenUpdateData,
  ): Promise<Almacen> {
    const response = await apiRequest<any>(`/almacenes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return this.normalizeAlmacen(extractItem<any>(response));
  }

  static async deleteAlmacen(id: string): Promise<boolean> {
    const response = await apiRequest<any>(`/almacenes/${id}`, {
      method: "DELETE",
    });
    if (response?.success === false) {
      throw new Error(response?.message || "No se pudo eliminar el almacen");
    }
    return true;
  }

  static async getTiendas(): Promise<Tienda[]> {
    const response = await apiRequest<any>("/tiendas/");
    return extractArray<any>(response).map((item) =>
      this.normalizeTienda(item),
    );
  }

  static async createTienda(data: TiendaCreateData): Promise<Tienda> {
    const response = await apiRequest<any>("/tiendas/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return this.normalizeTienda(extractItem<any>(response));
  }

  static async updateTienda(
    id: string,
    data: TiendaUpdateData,
  ): Promise<Tienda> {
    const response = await apiRequest<any>(`/tiendas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return this.normalizeTienda(extractItem<any>(response));
  }

  static async deleteTienda(id: string): Promise<boolean> {
    const response = await apiRequest<any>(`/tiendas/${id}`, {
      method: "DELETE",
    });
    if (response?.success === false) {
      throw new Error(response?.message || "No se pudo eliminar la tienda");
    }
    return true;
  }

  static async getStock(params?: {
    almacen_id?: string;
    q?: string;
    material_id?: string;
    material_codigo?: string;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
  }): Promise<StockItem[]> {
    const search = new URLSearchParams();
    if (params?.almacen_id) search.set("almacen_id", params.almacen_id);
    if (params?.q) search.set("q", params.q);
    if (params?.material_id) search.set("material_id", params.material_id);
    if (params?.material_codigo)
      search.set("material_codigo", params.material_codigo);
    if (params?.sort_by) search.set("sort_by", params.sort_by);
    if (params?.sort_dir) search.set("sort_dir", params.sort_dir);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    const response = await apiRequest<any>(`/inventario/stock${suffix}`);
    return this.normalizeStockResponse(response);
  }

  static async getMovimientos(params?: {
    tipo?: string;
    almacen_id?: string;
    tienda_id?: string;
    material_id?: string;
    material_codigo?: string;
  }): Promise<MovimientoInventario[]> {
    const search = new URLSearchParams();
    if (params?.tipo) search.set("tipo", params.tipo);
    if (params?.almacen_id) search.set("almacen_id", params.almacen_id);
    if (params?.tienda_id) search.set("tienda_id", params.tienda_id);
    if (params?.material_id) search.set("material_id", params.material_id);
    if (params?.material_codigo)
      search.set("material_codigo", params.material_codigo);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    const response = await apiRequest<any>(`/inventario/movimientos${suffix}`);
    return this.normalizeMovimientosResponse(response);
  }

  static async createMovimiento(
    data: MovimientoCreateData,
  ): Promise<MovimientoInventario> {
    const tipo = data.tipo;
    const materialId = await this.resolveMaterialId(data);
    const cantidad = tipo === "eliminacion" ? 0 : Number(data.cantidad);

    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error(
        "La cantidad del movimiento debe ser un numero mayor o igual a cero",
      );
    }

    const payload: Record<string, unknown> = {
      tipo,
      material_id: materialId,
      cantidad,
    };

    const motivo = asString(data.motivo);
    if (motivo) payload.motivo = motivo;

    const referencia = asString(data.referencia);
    if (referencia) payload.referencia = referencia;

    if (tipo === "transferencia") {
      const origenId = asString(data.almacen_origen_id);
      const destinoId = asString(data.almacen_destino_id);
      if (!origenId || !destinoId) {
        throw new Error(
          "La transferencia requiere almacen_origen_id y almacen_destino_id",
        );
      }
      if (origenId === destinoId) {
        throw new Error(
          "El almacen destino debe ser diferente al almacen origen",
        );
      }
      payload.almacen_origen_id = origenId;
      payload.almacen_destino_id = destinoId;
    } else if (tipo === "venta") {
      const tiendaId = asString(data.tienda_id);
      if (!tiendaId) {
        throw new Error("La venta requiere tienda_id");
      }
      payload.tienda_id = tiendaId;
      payload.almacen_origen_id = await this.resolveVentaAlmacenId(data);
    } else {
      const origenId = asString(data.almacen_origen_id);
      if (!origenId) {
        throw new Error(`${tipo} requiere almacen_origen_id`);
      }
      payload.almacen_origen_id = origenId;
    }

    const response = await apiRequest<any>("/inventario/movimientos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return this.normalizeMovimiento(extractItem<any>(response));
  }

  static async createMovimientoLote(
    data: MovimientoLoteCreateData,
  ): Promise<MovimientoLoteResponse> {
    const tipo = data.tipo;
    if (tipo !== "entrada" && tipo !== "salida") {
      throw new Error("El lote solo permite tipo entrada o salida");
    }

    const almacenId = asString(data.almacen_id);
    if (!almacenId) {
      throw new Error("almacen_id es requerido para registrar un lote");
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Debes enviar al menos un item en el lote");
    }

    const items = data.items.map((item) => {
      const materialCodigo = asString(item.material_codigo);
      const cantidad = Number(item.cantidad);

      if (!materialCodigo) {
        throw new Error("Cada item del lote requiere material_codigo");
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(
          `Cantidad invalida para el material ${materialCodigo}. Debe ser mayor que cero.`,
        );
      }

      const mapped: Record<string, unknown> = {
        material_codigo: materialCodigo,
        cantidad,
      };

      const origenCaptura = asString(item.origen_captura);
      if (origenCaptura) mapped.origen_captura = origenCaptura;

      const estado = asString(item.estado);
      if (estado) mapped.estado = estado;

      return mapped;
    });

    const payload: Record<string, unknown> = {
      tipo,
      almacen_id: almacenId,
      items,
    };

    const motivo = asString(data.motivo);
    if (motivo) payload.motivo = motivo;

    const referencia = asString(data.referencia);
    if (referencia) payload.referencia = referencia;

    const response = await apiRequest<any>("/inventario/movimientos/lote", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return this.normalizeMovimientoLoteResumen(response);
  }

  static async createVenta(data: VentaCreateData): Promise<any> {
    const response = await apiRequest<any>("/inventario/ventas", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response;
  }
}
