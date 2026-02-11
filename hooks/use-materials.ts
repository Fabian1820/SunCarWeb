import { useState, useEffect } from "react";
import { MaterialService } from "@/lib/api-services";
import type { Material } from "@/lib/material-types";
import type { BackendCatalogoProductos } from "@/lib/api-types";

interface UseMaterialsReturn {
  materials: Material[];
  categories: string[];
  catalogs: BackendCatalogoProductos[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchBackground: () => Promise<void>;
  registerNewCategory: (
    categoria: string,
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
  ) => void;
  createCategory: (categoria: string) => Promise<string>;
  createProduct: (categoria: string, materiales?: any[]) => Promise<string>;
  addMaterialToProduct: (
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
    categoria?: string,
  ) => Promise<boolean>;
  deleteMaterialByCodigo: (
    materialCodigo: string,
    categoria?: string,
  ) => Promise<boolean>;
  editMaterialInProduct: (
    productoId: string,
    materialCodigo: string,
    data: {
      codigo: string | number;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
    categoria?: string,
  ) => Promise<boolean>;
}

export function useMaterials(): UseMaterialsReturn {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<BackendCatalogoProductos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawCategories, setRawCategories] = useState<
    { id: string; categoria: string }[]
  >([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [materialsData, categoriesData, catalogsData] = await Promise.all([
        MaterialService.getAllMaterials(),
        MaterialService.getCategories(),
        MaterialService.getAllCatalogs(),
      ]);
      setMaterials(materialsData);
      setRawCategories(categoriesData);
      setCategories(categoriesData.map((c) => c.categoria));
      setCatalogs(catalogsData);
    } catch (err) {
      console.error("Error fetching materials:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar los materiales",
      );
    } finally {
      setLoading(false);
    }
  };

  // Refetch sin bloquear con loader global
  const silentRefetch = async () => {
    try {
      setError(null);
      const [materialsData, categoriesData, catalogsData] = await Promise.all([
        MaterialService.getAllMaterials(),
        MaterialService.getCategories(),
        MaterialService.getAllCatalogs(),
      ]);
      setMaterials(materialsData);
      setRawCategories(categoriesData);
      setCategories(categoriesData.map((c) => c.categoria));
      setCatalogs(catalogsData);
    } catch (err) {
      console.error("Error fetching materials (silent):", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar los materiales",
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Funciones para crear/agregar
  const createCategory = async (categoria: string) => {
    const id = await MaterialService.createCategory(categoria);
    // Actualización local para evitar recarga completa
    setRawCategories((prev) => {
      if (prev.some((c) => c.categoria === categoria)) return prev;
      return [...prev, { id, categoria }];
    });
    setCategories((prev) =>
      prev.includes(categoria) ? prev : [...prev, categoria],
    );
    // Opcional: reflejar catálogo vacío localmente
    setCatalogs((prev) =>
      prev.some((c) => c.categoria === categoria)
        ? prev
        : [...prev, { id, categoria, materiales: [] } as any],
    );
    return id;
  };

  const createProduct = async (categoria: string, materiales: any[] = []) => {
    const id = await MaterialService.createProduct(categoria, materiales);
    // Reflejar localmente
    setCatalogs((prev) => {
      if (prev.some((c) => c.categoria === categoria)) return prev;
      return [...prev, { id, categoria, materiales } as any];
    });
    setCategories((prev) =>
      prev.includes(categoria) ? prev : [...prev, categoria],
    );
    return id;
  };

  const addMaterialToProduct = async (
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
    categoria?: string,
  ) => {
    console.log("[useMaterials] Adding material:", {
      productoId,
      material,
      categoria,
    });

    try {
      const ok = await MaterialService.addMaterialToProduct(
        productoId,
        material,
      );
      console.log("[useMaterials] Add result:", ok);
      if (!ok) {
        throw new Error("No se pudo agregar el material");
      }

      // Actualización optimista del estado local
      setMaterials((prev) => {
        console.log(
          "[useMaterials] Current materials before add:",
          prev.length,
        );
        const newMaterial: Material = {
          id: `${productoId}_${material.codigo}`,
          codigo: material.codigo,
          descripcion: material.descripcion,
          um: material.um,
          precio: material.precio,
          categoria: categoria || "",
          nombre: material.nombre,
          foto: material.foto,
          marca_id: material.marca_id,
          potenciaKW: material.potenciaKW,
          habilitar_venta_web: material.habilitar_venta_web,
          precio_por_cantidad: material.precio_por_cantidad,
          especificaciones: material.especificaciones,
          producto_id: productoId,
        } as Material;
        console.log("[useMaterials] New material to add:", newMaterial);

        // Evitar duplicados por código/categoría
        const exists = prev.some(
          (m) =>
            String(m.codigo) === String(material.codigo) &&
            m.categoria === categoria,
        );
        console.log("[useMaterials] Material exists?", exists);

        if (exists) {
          console.log("[useMaterials] Material already exists, not adding");
          return prev;
        }

        const updated = [newMaterial, ...prev];
        console.log("[useMaterials] Updated materials count:", updated.length);
        return updated;
      });

      // También actualizar catálogo local si existe
      setCatalogs((prev) =>
        prev.map((c) =>
          c.id === (productoId as any)
            ? {
                ...c,
                materiales: [...((c.materiales as any[]) || []), material],
              }
            : c,
        ),
      );
      return true;
    } catch (error) {
      console.error("[useMaterials] Error adding material:", error);
      throw error;
    }
  };

  const registerNewCategory = (
    categoria: string,
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
  ) => {
    setRawCategories((prev) => {
      if (prev.some((c) => c.categoria === categoria)) return prev;
      return [...prev, { id: productoId, categoria }];
    });
    setCategories((prev) =>
      prev.includes(categoria) ? prev : [...prev, categoria],
    );

    setCatalogs((prev) => {
      const exists = prev.some(
        (c) => c.id === productoId || c.categoria === categoria,
      );
      if (!exists) {
        return [
          ...prev,
          { id: productoId, categoria, materiales: [material] } as any,
        ];
      }
      return prev.map((c) => {
        if (c.id !== productoId && c.categoria !== categoria) return c;
        const materiales = [...((c.materiales as any[]) || [])];
        const hasMaterial = materiales.some(
          (m) => String(m.codigo) === String(material.codigo),
        );
        if (!hasMaterial) {
          materiales.push(material);
        }
        return { ...c, categoria, materiales };
      });
    });

    setMaterials((prev) => {
      const exists = prev.some(
        (m) =>
          String(m.codigo) === String(material.codigo) &&
          m.categoria === categoria,
      );
      if (exists) return prev;
      const newMaterial: Material = {
        id: `${productoId}_${material.codigo}`,
        codigo: material.codigo,
        descripcion: material.descripcion,
        um: material.um,
        precio: material.precio,
        categoria,
        nombre: material.nombre,
        foto: material.foto,
        marca_id: material.marca_id,
        potenciaKW: material.potenciaKW,
        habilitar_venta_web: material.habilitar_venta_web,
        precio_por_cantidad: material.precio_por_cantidad,
        especificaciones: material.especificaciones,
        producto_id: productoId,
      } as Material;
      return [newMaterial, ...prev];
    });
  };

  const editMaterialInProduct = async (
    productoId: string,
    materialCodigo: string,
    data: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
    },
    categoria?: string,
  ) => {
    try {
      console.log("[useMaterials] Editing material:", {
        productoId,
        materialCodigo,
        data,
        categoria,
      });

      // Asegurar que el código sea string
      const payload = {
        ...data,
        codigo: String(data.codigo),
      };

      const ok = await MaterialService.editMaterialInProduct(
        productoId,
        String(materialCodigo),
        payload,
      );
      console.log("[useMaterials] Edit result:", ok);

      if (!ok) {
        throw new Error("Error al actualizar el material");
      }

      // Actualización optimista: mapear y reemplazar con TODOS los campos
      setMaterials((prev) => {
        const updated = prev.map((m) => {
          const sameCode = String(m.codigo) === String(materialCodigo);
          const sameCategory = categoria ? m.categoria === categoria : true;

          if (sameCode && sameCategory) {
            console.log(
              "[useMaterials] Updating material:",
              m.codigo,
              "with data:",
              payload,
            );
            // Crear nuevo objeto con todos los campos actualizados
            const updatedMaterial = {
              ...m,
              codigo: String(payload.codigo),
              descripcion: payload.descripcion,
              um: payload.um,
              precio: payload.precio ?? m.precio,
              nombre: payload.nombre ?? m.nombre,
              foto: payload.foto ?? m.foto,
              marca_id: payload.marca_id ?? m.marca_id,
              potenciaKW: payload.potenciaKW ?? m.potenciaKW,
              habilitar_venta_web:
                payload.habilitar_venta_web ?? m.habilitar_venta_web,
              precio_por_cantidad:
                payload.precio_por_cantidad !== undefined
                  ? payload.precio_por_cantidad
                  : m.precio_por_cantidad,
              especificaciones:
                payload.especificaciones !== undefined
                  ? payload.especificaciones
                  : m.especificaciones,
            };
            console.log("[useMaterials] Updated material:", updatedMaterial);
            return updatedMaterial;
          }
          return m;
        });

        console.log("[useMaterials] Materials updated, count:", updated.length);
        return updated;
      });

      // Actualizar catálogo local
      setCatalogs((prev) =>
        prev.map((c) =>
          c.id === (productoId as any)
            ? {
                ...c,
                materiales: ((c.materiales as any[]) || []).map((mat) =>
                  String(mat.codigo) === String(materialCodigo)
                    ? { ...mat, ...payload }
                    : mat,
                ),
              }
            : c,
        ),
      );

      return true;
    } catch (error) {
      console.error("[useMaterials] Error editing material:", error);
      throw error;
    }
  };

  const deleteMaterialByCodigo = async (
    materialCodigo: string,
    categoria?: string,
  ) => {
    try {
      const ok = await MaterialService.deleteMaterialByCodigo(
        String(materialCodigo),
      );
      if (!ok) {
        throw new Error("Error al eliminar el material");
      }
      // Actualización optimista eliminando del estado local
      setMaterials((prev) =>
        prev.filter((m) => {
          const sameCode = String(m.codigo) === String(materialCodigo);
          if (!sameCode) return true;
          // Si se proporcionó categoría, eliminar solo en esa categoría
          return categoria ? m.categoria !== categoria : false;
        }),
      );
      // También actualizar catálogos
      setCatalogs((prev) =>
        prev.map((c) => ({
          ...c,
          materiales: ((c.materiales as any[]) || []).filter(
            (mat) => String(mat.codigo) !== String(materialCodigo),
          ),
        })),
      );
      return true;
    } catch (error) {
      console.error("[useMaterials] Error deleting material:", error);
      throw error;
    }
  };

  return {
    materials,
    categories,
    catalogs,
    loading,
    error,
    refetch: fetchData,
    // @ts-expect-error Exponer método interno sin romper la API existente
    refetchBackground: silentRefetch,
    registerNewCategory,
    createCategory,
    createProduct,
    addMaterialToProduct,
    deleteMaterialByCodigo,
    editMaterialInProduct,
  };
}
