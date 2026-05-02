/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type { BackendCatalogoProductos } from "../../../api-types";
import type {
  Material,
  CreateCategoryRequest,
  CreateMaterialRequest,
  UpdateCategoryRequest,
  AddMaterialToCategoryRequest,
} from "../../../material-types";

export class MaterialService {
  private static normalizeSearchMaterial(raw: any): Material | null {
    const codigo = String(
      raw?.codigo ?? raw?.material_codigo ?? raw?.material?.codigo ?? "",
    ).trim();
    if (!codigo) return null;

    const descripcion = String(
      raw?.descripcion ??
        raw?.material_descripcion ??
        raw?.nombre ??
        raw?.material?.descripcion ??
        raw?.material?.nombre ??
        "",
    ).trim();

    const categoria = String(
      raw?.categoria ??
        raw?.producto_categoria ??
        raw?.producto?.categoria ??
        raw?.catalogo?.categoria ??
        "Sin categoria",
    ).trim();

    const id = String(
      raw?.id ??
        raw?._id ??
        raw?.material_id ??
        raw?.material?.id ??
        raw?.material?._id ??
        `${categoria || "material"}_${codigo}`,
    );

    return {
      id,
      codigo,
      categoria: categoria || "Sin categoria",
      descripcion: descripcion || "Sin descripcion",
      um: String(raw?.um ?? raw?.material?.um ?? ""),
      precio:
        typeof raw?.precio === "number"
          ? raw.precio
          : typeof raw?.material?.precio === "number"
            ? raw.material.precio
            : undefined,
      nombre: typeof raw?.nombre === "string" ? raw.nombre : undefined,
      marca_id: typeof raw?.marca_id === "string" ? raw.marca_id : undefined,
      foto: typeof raw?.foto === "string" ? raw.foto : undefined,
      potenciaKW:
        typeof raw?.potenciaKW === "number" ? raw.potenciaKW : undefined,
      habilitar_venta_web:
        typeof raw?.habilitar_venta_web === "boolean"
          ? raw.habilitar_venta_web
          : undefined,
      precio_por_cantidad:
        raw?.precio_por_cantidad && typeof raw.precio_por_cantidad === "object"
          ? raw.precio_por_cantidad
          : undefined,
      especificaciones:
        raw?.especificaciones && typeof raw.especificaciones === "object"
          ? raw.especificaciones
          : undefined,
      ficha_tecnica_url:
        typeof raw?.ficha_tecnica_url === "string"
          ? raw.ficha_tecnica_url
          : null,
      ubicacion_en_almacen:
        typeof raw?.ubicacion_en_almacen === "string"
          ? raw.ubicacion_en_almacen
          : null,
      comentario: typeof raw?.comentario === "string" ? raw.comentario : null,
      numero_serie:
        typeof raw?.numero_serie === "string" ? raw.numero_serie : null,
      stockaje_minimo:
        typeof raw?.stockaje_minimo === "number" ? raw.stockaje_minimo : null,
    };
  }

  private static async resolveProductIdByCategory(
    categoria: string,
  ): Promise<string | null> {
    try {
      const catalogos = await MaterialService.getAllCatalogs();
      const found = catalogos.find((cat) => cat.categoria === categoria);
      return found?.id || null;
    } catch (error) {
      console.error(
        "[MaterialService] Error resolving product id by category:",
        error,
      );
      return null;
    }
  }

  private static async resolveProductIdWithRetry(
    categoria: string,
    retries = 3,
    delayMs = 300,
  ): Promise<string | null> {
    for (let i = 0; i < retries; i += 1) {
      const id = await MaterialService.resolveProductIdByCategory(categoria);
      if (id) return id;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  }

  static async getAllMaterials(): Promise<Material[]> {
    const result = await apiRequest<{ data: any[] }>("/productos/");
    return result.data.flatMap((cat: any) =>
      (cat.materiales || []).map((m: any) => ({
        ...m,
        // Usa el ObjectId del producto como identificador base; si el material trae su propio _id, úsalo
        id: m._id || m.id || m.material_id || cat.id,
        material_key: `${m._id || m.id || m.material_id || cat.id}__${m.codigo}`,
        categoria: cat.categoria,
        producto_id: cat.id,
        // Asegurar que codigo sea un string
        codigo: String(m.codigo),
      })),
    );
  }

  static async searchMaterialsByCode(
    query: string,
    limit = 10,
  ): Promise<Material[]> {
    const term = query.trim();
    if (!term) return [];

    const response = await apiRequest<any>(
      `/productos/materiales?q=${encodeURIComponent(term)}&limit=${limit}`,
    );

    const payload = response?.data ?? response;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.materiales)
          ? payload.materiales
          : [];

    return rows
      .map((item: any) => this.normalizeSearchMaterial(item))
      .filter((item: Material | null): item is Material => item !== null);
  }

  static async getCategories(): Promise<
    { id: string; categoria: string; nombre?: string }[]
  > {
    const result = await apiRequest<{
      data: { id: string; categoria?: string; nombre?: string }[];
    }>("/productos/categorias");
    // Normalizar: asegurar que siempre tengamos 'categoria'
    return result.data.map((cat) => ({
      id: cat.id,
      categoria: cat.categoria || cat.nombre || "",
      nombre: cat.nombre || cat.categoria,
    }));
  }

  static async getMaterialsByCategory(categoria: string): Promise<Material[]> {
    const result = await apiRequest<{ data: Material[] }>(
      `/productos/categorias/${encodeURIComponent(categoria)}/materiales`,
    );
    return result.data;
  }

  static async createCategory(categoria: string): Promise<string> {
    const result = await apiRequest<any>("/productos/categorias", {
      method: "POST",
      body: JSON.stringify({ categoria }),
    });
    let productoId =
      result?.producto_id ||
      result?.id ||
      result?.data?.id ||
      result?.data?.producto_id;
    if (!productoId) {
      productoId = await MaterialService.resolveProductIdWithRetry(categoria);
    }
    if (!productoId) {
      throw new Error("No se pudo determinar el ID de la categoria creada");
    }
    return productoId;
  }

  static async createProduct(
    categoria: string,
    materiales: any[] = [],
  ): Promise<string> {
    const result = await apiRequest<any>("/productos/", {
      method: "POST",
      body: JSON.stringify({ categoria, materiales }),
    });
    let productoId =
      result?.producto_id ||
      result?.id ||
      result?.data?.id ||
      result?.data?.producto_id;
    if (!productoId) {
      productoId = await MaterialService.resolveProductIdWithRetry(categoria);
    }
    if (!productoId) {
      throw new Error("No se pudo determinar el ID del producto creado");
    }
    return productoId;
  }

  static async addMaterialToProduct(
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      ubicacion_en_almacen?: string | null;
      comentario?: string | null;
      nombre?: string;
      marca_id?: string;
      foto?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
      ficha_tecnica_url?: string | null;
      numero_serie?: string | null;
      stockaje_minimo?: number | null;
    },
  ): Promise<boolean> {
    console.log("[MaterialService] Agregando material a producto:", {
      productoId,
      material,
    });
    try {
      const result = await apiRequest<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(`/productos/${productoId}/materiales`, {
        method: "POST",
        body: JSON.stringify({ material }),
      });
      console.log("[MaterialService] Respuesta al agregar material:", result);

      if (result === null || result === undefined) {
        console.log(
          "[MaterialService] Respuesta nula, asumiendo adición exitosa",
        );
        return true;
      }

      if (typeof result === "object") {
        if (result.success === true) {
          return true;
        }
        if (result.success === undefined && !result.error) {
          console.log(
            "[MaterialService] Sin campo success pero sin errores, asumiendo adición exitosa",
          );
          return true;
        }
        if (result.error) {
          throw new Error(result.error);
        }
        if (result.success === false) {
          throw new Error(result.message || "Error al agregar material");
        }
      }

      return true;
    } catch (error: any) {
      console.error("[MaterialService] Error al agregar material:", error);
      throw error;
    }
  }

  static async deleteMaterialByCodigo(
    materialCodigo: string,
  ): Promise<boolean> {
    console.log("[MaterialService] Intentando eliminar material por código:", {
      materialCodigo,
    });
    try {
      const result = await apiRequest<{
        success?: boolean;
        message?: string;
        detail?: string;
        error?: string;
      }>(`/productos/materiales/${encodeURIComponent(materialCodigo)}`, {
        method: "DELETE",
      });
      console.log("[MaterialService] Respuesta al eliminar material:", result);

      if (typeof result === "object" && result !== null) {
        if (result.success === true) {
          console.log("[MaterialService] Material eliminado exitosamente");
          return true;
        }

        if (result.error || result.success === false) {
          const errorMsg =
            result.error || result.message || "Error al eliminar material";
          console.error("[MaterialService] Error del backend:", errorMsg);
          throw new Error(errorMsg);
        }

        if (!result.success && !result.error && result.message) {
          console.log("[MaterialService] Respuesta ambigua, asumiendo éxito");
          return true;
        }
      }

      console.log(
        "[MaterialService] Respuesta vacía, asumiendo eliminación exitosa",
      );
      return true;
    } catch (error: any) {
      console.error("[MaterialService] Error al eliminar material:", error);
      throw error;
    }
  }

  static async editMaterialInProduct(
    productoId: string,
    materialCodigo: string,
    data: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      ubicacion_en_almacen?: string | null;
      comentario?: string | null;
      nombre?: string;
      marca_id?: string;
      foto?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
      ficha_tecnica_url?: string | null;
      numero_serie?: string | null;
      stockaje_minimo?: number | null;
    },
  ): Promise<boolean> {
    console.log("[MaterialService] Editando material:", {
      productoId,
      materialCodigo,
      data,
    });
    try {
      // Asegurar que el código sea string
      const payload = {
        ...data,
        codigo: String(data.codigo),
      };

      const result = await apiRequest<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(
        `/productos/${productoId}/materiales/${encodeURIComponent(materialCodigo)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      console.log("[MaterialService] Respuesta al editar material:", result);

      if (result === null || result === undefined) {
        console.log(
          "[MaterialService] Respuesta nula, asumiendo edición exitosa",
        );
        return true;
      }

      if (typeof result === "object") {
        if (result.success === true) {
          return true;
        }
        if (result.success === undefined && !result.error) {
          console.log(
            "[MaterialService] Sin campo success pero sin errores, asumiendo edición exitosa",
          );
          return true;
        }
        if (result.error) {
          throw new Error(result.error);
        }
        if (result.success === false) {
          throw new Error(result.message || "Error al editar material");
        }
      }

      return true;
    } catch (error: any) {
      console.error("[MaterialService] Error al editar material:", error);
      throw error;
    }
  }

  static async getAllCatalogs(): Promise<BackendCatalogoProductos[]> {
    const result = await apiRequest<{ data: BackendCatalogoProductos[] }>(
      "/productos/",
    );
    return result.data;
  }

  /**
   * Endpoint liviano: devuelve solo los campos necesarios para listar
   * materiales en el flujo de ofertas (codigo, descripcion, nombre, precio,
   * marca_id, potenciaKW, foto). NO incluye especificaciones, fichas técnicas,
   * precios por cantidad, etc. Para flujos de gestión usar getAllCatalogs().
   */
  static async getAllCatalogsLite(): Promise<BackendCatalogoProductos[]> {
    const result = await apiRequest<{ data: BackendCatalogoProductos[] }>(
      "/productos/lite",
    );
    return result.data;
  }

  /**
   * Variante lite filtrada por categoría. Devuelve un array de catálogos
   * (típicamente 1) con sus materiales en formato lite.
   */
  static async getCategoryLite(
    categoria: string,
  ): Promise<BackendCatalogoProductos[]> {
    const result = await apiRequest<{ data: BackendCatalogoProductos[] }>(
      `/productos/lite?categoria=${encodeURIComponent(categoria)}`,
    );
    return result.data;
  }

  // Category management methods
  static async createCategoryWithMaterials(
    data: CreateCategoryRequest,
  ): Promise<string> {
    const result = await apiRequest<any>("/productos/", {
      method: "POST",
      body: JSON.stringify({
        categoria: data.categoria,
        materiales: data.materiales || [],
      }),
    });
    let productoId =
      result?.producto_id ||
      result?.id ||
      result?.data?.id ||
      result?.data?.producto_id;
    if (!productoId) {
      productoId = await MaterialService.resolveProductIdWithRetry(
        data.categoria,
      );
    }
    if (!productoId) {
      throw new Error("No se pudo determinar el ID de la categoria creada");
    }
    return productoId;
  }

  static async updateCategory(
    productoId: string,
    data: UpdateCategoryRequest,
  ): Promise<boolean> {
    const result = await apiRequest<{
      success?: boolean;
      message?: string;
      error?: string;
    }>(`/productos/${productoId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (result?.success === false || result?.error) {
      throw new Error(
        result.error || result.message || "Error al actualizar categoría",
      );
    }

    return true;
  }

  static async addMaterialToCategoryWithPhoto(
    productoId: string,
    data: AddMaterialToCategoryRequest,
  ): Promise<boolean> {
    const result = await apiRequest<{
      success?: boolean;
      message?: string;
      error?: string;
    }>(`/productos/${productoId}/materiales`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (result?.success === false || result?.error) {
      throw new Error(
        result.error || result.message || "Error al agregar material",
      );
    }

    return true;
  }

  static async getCatalogoAdmin(params: {
    q?: string;
    categoria?: string;
    marca_id?: string;
    precio_zero?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{
    data: Material[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.categoria) qs.set("categoria", params.categoria);
    if (params.marca_id) qs.set("marca_id", params.marca_id);
    if (params.precio_zero === true) qs.set("precio_zero", "true");
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.sort) qs.set("sort", params.sort);

    const result = await apiRequest<{
      data: any[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/productos/admin/materiales?${qs.toString()}`);

    const materials: Material[] = (result.data || []).map((item: any) => ({
      id: item.material_id || item.codigo || "",
      material_id: item.material_id,
      codigo: String(item.codigo || ""),
      categoria: item.categoria || "",
      descripcion: item.descripcion || "",
      nombre: item.nombre ?? undefined,
      um: item.um || "",
      precio: typeof item.precio === "number" ? item.precio : undefined,
      marca_id: item.marca_id ?? undefined,
      foto: item.foto ?? undefined,
      potenciaKW: item.potenciaKW ?? undefined,
      habilitar_venta_web: item.habilitar_venta_web ?? false,
      numero_serie: item.numero_serie ?? null,
      stockaje_minimo: item.stockaje_minimo ?? null,
      ubicacion_en_almacen: item.ubicacion_en_almacen ?? null,
      comentario: item.comentario ?? null,
      ficha_tecnica_url: item.ficha_tecnica_url ?? null,
      precio_por_cantidad: item.precio_por_cantidad ?? undefined,
      especificaciones: item.especificaciones ?? undefined,
      codigo_contabilidad: item.codigo_contabilidad ?? undefined,
      cantidad_contabilidad: item.cantidad_contabilidad ?? undefined,
      precio_contabilidad: item.precio_contabilidad ?? undefined,
      producto_id: item.producto_id ?? undefined,
    }));

    return { data: materials, meta: result.meta };
  }

  static async uploadFichaTecnica(file: File): Promise<string> {
    console.log("[MaterialService] Subiendo ficha técnica:", file.name);
    
    const formData = new FormData();
    formData.append("ficha", file);

    try {
      const result = await apiRequest<{
        success?: boolean;
        url?: string;
        message?: string;
        error?: string;
      }>("/productos/upload-ficha-tecnica", {
        method: "POST",
        body: formData,
      });

      console.log("[MaterialService] Respuesta al subir ficha técnica:", result);

      if (result?.url) {
        return result.url;
      }

      if (result?.error || result?.success === false) {
        throw new Error(
          result.error || result.message || "Error al subir ficha técnica",
        );
      }

      throw new Error("No se recibió URL de la ficha técnica");
    } catch (error: any) {
      console.error("[MaterialService] Error al subir ficha técnica:", error);
      throw error;
    }
  }
}
