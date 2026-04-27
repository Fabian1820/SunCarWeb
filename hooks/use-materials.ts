import { useEffect, useState } from "react";
import { MaterialService } from "@/lib/api-services";
import type { Material } from "@/lib/material-types";
import type { BackendCatalogoProductos } from "@/lib/api-types";

interface UseMaterialsReturn {
  materials: Material[];
  categories: string[];
  catalogs: BackendCatalogoProductos[];
  loading: boolean;
  /**
   * `true` cuando ya hay al menos UNA categoría cargada (carga progresiva).
   * Útil para mostrar la UI antes de tener todas las categorías.
   */
  hasAnyCategoryLoaded: boolean;
  loadedCategories: Set<string>;
  loadingCategories: Set<string>;
  error: string | null;
  refetch: () => Promise<void>;
  refetchBackground: () => Promise<void>;
  /**
   * Carga los materiales de una categoría específica (endpoint liviano).
   * Cachea por nombre de categoría — llamadas repetidas no hacen red.
   */
  loadCategoryMaterials: (categoria: string) => Promise<void>;
  /**
   * Carga la lista de nombres de categorías sin traer materiales.
   */
  ensureCategoriesList: () => Promise<void>;
  registerNewCategory: (
    categoria: string,
    productoId: string,
    material: {
      codigo: string;
      descripcion: string;
      um: string;
      precio?: number;
      ubicacion_en_almacen?: string | null;
      comentario?: string | null;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
      ficha_tecnica_url?: string | null;
      numero_serie?: string | null;
      stockaje_minimo?: number | null;
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
      ubicacion_en_almacen?: string | null;
      comentario?: string | null;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
      ficha_tecnica_url?: string | null;
      numero_serie?: string | null;
      stockaje_minimo?: number | null;
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
      ubicacion_en_almacen?: string | null;
      comentario?: string | null;
      nombre?: string;
      foto?: string;
      marca_id?: string;
      potenciaKW?: number;
      habilitar_venta_web?: boolean;
      precio_por_cantidad?: Record<string, number> | null;
      especificaciones?: Record<string, string> | null;
      ficha_tecnica_url?: string | null;
      numero_serie?: string | null;
      stockaje_minimo?: number | null;
    },
    categoria?: string,
  ) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Cache module-level: dos stores independientes — "full" y "lite".
// - full: usa GET /productos/ (todos los campos). Para módulos de gestión.
// - lite: usa GET /productos/lite (solo campos necesarios para listar en
//   ofertas). Para flujos de confección/visualización.
// Las mutaciones se aplican a AMBOS stores para que los edits se propaguen.
// ---------------------------------------------------------------------------

type StoreState = {
  materials: Material[];
  categories: string[];
  catalogs: BackendCatalogoProductos[];
  rawCategories: { id: string; categoria: string }[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  loadedCategories: Set<string>;
  loadingCategories: Set<string>;
  categoriesListReady: boolean;
};

const TTL_MS = 5 * 60 * 1000;

const createInitialState = (): StoreState => ({
  materials: [],
  categories: [],
  catalogs: [],
  rawCategories: [],
  loading: true,
  error: null,
  initialized: false,
  loadedCategories: new Set(),
  loadingCategories: new Set(),
  categoriesListReady: false,
});

type StoreInstance = {
  getState: () => StoreState;
  setState: (updater: (s: StoreState) => StoreState) => void;
  subscribe: (fn: () => void) => () => void;
  fetchAll: (silent: boolean) => Promise<void>;
  ensureLoaded: () => Promise<void>;
  forceRefetch: () => Promise<void>;
  ensureCategoriesList: () => Promise<void>;
  loadCategoryMaterials: (categoria: string) => Promise<void>;
};

const createStore = (
  fetchCatalogs: () => Promise<BackendCatalogoProductos[]>,
  fetchByCategory?: (categoria: string) => Promise<Material[]>,
): StoreInstance => {
  let state = createInitialState();
  let lastFetchedAt = 0;
  let inFlight: Promise<void> | null = null;
  let categoriesListInFlight: Promise<void> | null = null;
  const categoryFetchInFlight = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setState = (updater: (s: StoreState) => StoreState) => {
    state = updater(state);
    notify();
  };
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };

  const fetchAll = async (silent: boolean): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      if (!silent) {
        setState((s) => ({ ...s, loading: true, error: null }));
      } else {
        setState((s) => ({ ...s, error: null }));
      }
      try {
        const [catalogsData, categoriesData] = await Promise.all([
          fetchCatalogs(),
          MaterialService.getCategories(),
        ]);
        const materials = flattenMaterials(catalogsData);
        const categoriesNames = categoriesData.map((c) => c.categoria);
        setState(() => ({
          materials,
          catalogs: catalogsData,
          rawCategories: categoriesData,
          categories: categoriesNames,
          loading: false,
          error: null,
          initialized: true,
          loadedCategories: new Set([
            ...categoriesNames,
            ...catalogsData.map((c: any) => c.categoria),
          ]),
          loadingCategories: new Set(),
          categoriesListReady: true,
        }));
        lastFetchedAt = Date.now();
      } catch (err) {
        console.error("Error fetching materials:", err);
        setState((s) => ({
          ...s,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al cargar los materiales",
          initialized: true,
        }));
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  const ensureLoaded = async (): Promise<void> => {
    const fresh =
      state.initialized &&
      state.materials.length > 0 &&
      Date.now() - lastFetchedAt < TTL_MS;
    if (fresh) return;
    return fetchAll(state.initialized);
  };

  const forceRefetch = (): Promise<void> => fetchAll(false);

  const ensureCategoriesList = async (): Promise<void> => {
    if (state.categoriesListReady) return;
    if (categoriesListInFlight) return categoriesListInFlight;
    categoriesListInFlight = (async () => {
      try {
        const categoriesData = await MaterialService.getCategories();
        setState((s) => ({
          ...s,
          rawCategories: categoriesData,
          categories: categoriesData.map((c) => c.categoria),
          categoriesListReady: true,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error:
            err instanceof Error
              ? err.message
              : "Error al cargar las categorías",
        }));
      } finally {
        categoriesListInFlight = null;
      }
    })();
    return categoriesListInFlight;
  };

  const loadCategoryMaterials = async (categoria: string): Promise<void> => {
    if (!categoria) return;
    if (state.loadedCategories.has(categoria)) return;
    const existing = categoryFetchInFlight.get(categoria);
    if (existing) return existing;
    const promise = (async () => {
      setState((s) => {
        const loadingCategories = new Set(s.loadingCategories);
        loadingCategories.add(categoria);
        return { ...s, loadingCategories };
      });
      try {
        const items = fetchByCategory
          ? await fetchByCategory(categoria)
          : await MaterialService.getMaterialsByCategory(categoria);
        setState((s) => {
          const seen = new Set(
            s.materials.map((m) => `${m.categoria}__${String(m.codigo)}`),
          );
          const incoming = (items || []).map((m: any) => ({
            ...m,
            categoria: m.categoria || categoria,
            codigo: String(m.codigo),
          })) as Material[];
          const newOnes = incoming.filter(
            (m) => !seen.has(`${m.categoria}__${String(m.codigo)}`),
          );
          const loadedCategories = new Set(s.loadedCategories);
          loadedCategories.add(categoria);
          const loadingCategories = new Set(s.loadingCategories);
          loadingCategories.delete(categoria);
          return {
            ...s,
            materials: newOnes.length
              ? [...s.materials, ...newOnes]
              : s.materials,
            loadedCategories,
            loadingCategories,
            initialized: true,
          };
        });
      } catch (err) {
        setState((s) => {
          const loadingCategories = new Set(s.loadingCategories);
          loadingCategories.delete(categoria);
          return {
            ...s,
            loadingCategories,
            error:
              err instanceof Error
                ? err.message
                : `Error al cargar la categoría ${categoria}`,
          };
        });
      } finally {
        categoryFetchInFlight.delete(categoria);
      }
    })();
    categoryFetchInFlight.set(categoria, promise);
    return promise;
  };

  return {
    getState: () => state,
    setState,
    subscribe,
    fetchAll,
    ensureLoaded,
    forceRefetch,
    ensureCategoriesList,
    loadCategoryMaterials,
  };
};

const flattenMaterials = (
  catalogs: BackendCatalogoProductos[],
): Material[] =>
  catalogs.flatMap((cat: any) =>
    (cat.materiales || []).map((m: any) => ({
      ...m,
      id: m._id || m.id || m.material_id || cat.id,
      material_key: `${m._id || m.id || m.material_id || cat.id}__${m.codigo}`,
      categoria: cat.categoria,
      producto_id: cat.id,
      codigo: String(m.codigo),
    })),
  );

const fullStore = createStore(MaterialService.getAllCatalogs);
const liteStore = createStore(
  MaterialService.getAllCatalogsLite,
  // Para el lite store, cuando se pide una sola categoría usamos el mismo
  // endpoint /productos/lite?categoria=X y aplanamos a Material[]
  async (categoria: string) => {
    const cats = await MaterialService.getCategoryLite(categoria);
    return flattenMaterials(cats);
  },
);

/**
 * Aplica una mutación a AMBOS stores. Si solo uno está inicializado, el otro
 * se invalida (próxima lectura re-fetchea) para evitar inconsistencias.
 */
const applyToBothStores = (
  updater: (s: StoreState) => StoreState,
) => {
  fullStore.setState(updater);
  liteStore.setState(updater);
};

export function useMaterials(options?: {
  /**
   * Si es `true`, NO dispara la carga al montar. El consumidor decide cuándo
   * cargar (vía `refetch`, `ensureCategoriesList` o `loadCategoryMaterials`).
   */
  lazy?: boolean;
  /**
   * Si es `true`, usa el endpoint /productos/lite (sin campos pesados).
   * Para flujos de visualización/confección de ofertas. NO usar en flujos
   * que necesiten especificaciones, fichas técnicas, precio_por_cantidad, etc.
   */
  lite?: boolean;
}): UseMaterialsReturn {
  const lazy = options?.lazy ?? false;
  const lite = options?.lite ?? false;
  const store = lite ? liteStore : fullStore;
  const [snapshot, setSnapshot] = useState<StoreState>(store.getState());

  useEffect(() => {
    const update = () => setSnapshot(store.getState());
    const unsubscribe = store.subscribe(update);
    update();
    if (!lazy) {
      store.ensureLoaded();
    }
    return unsubscribe;
  }, [lazy, store]);

  // Reasignar setStoreState para que las mutaciones afecten ambos stores
  const setStoreState = applyToBothStores;

  const createCategory = async (categoria: string) => {
    const id = await MaterialService.createCategory(categoria);
    setStoreState((s) => {
      const rawCategories = s.rawCategories.some(
        (c) => c.categoria === categoria,
      )
        ? s.rawCategories
        : [...s.rawCategories, { id, categoria }];
      const categories = s.categories.includes(categoria)
        ? s.categories
        : [...s.categories, categoria];
      const catalogs = s.catalogs.some((c) => c.categoria === categoria)
        ? s.catalogs
        : ([...s.catalogs, { id, categoria, materiales: [] } as any] as BackendCatalogoProductos[]);
      return { ...s, rawCategories, categories, catalogs };
    });
    return id;
  };

  const createProduct = async (categoria: string, materiales: any[] = []) => {
    const id = await MaterialService.createProduct(categoria, materiales);
    setStoreState((s) => {
      const catalogs = s.catalogs.some((c) => c.categoria === categoria)
        ? s.catalogs
        : ([...s.catalogs, { id, categoria, materiales } as any] as BackendCatalogoProductos[]);
      const categories = s.categories.includes(categoria)
        ? s.categories
        : [...s.categories, categoria];
      return { ...s, catalogs, categories };
    });
    return id;
  };

  const addMaterialToProduct = async (
    productoId: string,
    material: any,
    categoria?: string,
  ) => {
    try {
      const ok = await MaterialService.addMaterialToProduct(
        productoId,
        material,
      );
      if (!ok) throw new Error("No se pudo agregar el material");

      setStoreState((s) => {
        const newMaterial: Material = {
          id: `${productoId}_${material.codigo}`,
          codigo: material.codigo,
          descripcion: material.descripcion,
          um: material.um,
          precio: material.precio,
          ubicacion_en_almacen: material.ubicacion_en_almacen ?? null,
          comentario: material.comentario ?? null,
          categoria: categoria || "",
          nombre: material.nombre,
          foto: material.foto,
          marca_id: material.marca_id,
          potenciaKW: material.potenciaKW,
          habilitar_venta_web: material.habilitar_venta_web,
          precio_por_cantidad: material.precio_por_cantidad,
          especificaciones: material.especificaciones,
          ficha_tecnica_url: material.ficha_tecnica_url,
          numero_serie: material.numero_serie ?? null,
          stockaje_minimo: material.stockaje_minimo ?? null,
          producto_id: productoId,
        } as Material;

        const exists = s.materials.some(
          (m) =>
            String(m.codigo) === String(material.codigo) &&
            m.categoria === categoria,
        );
        const materials = exists ? s.materials : [newMaterial, ...s.materials];
        const catalogs = s.catalogs.map((c) =>
          c.id === (productoId as any)
            ? {
                ...c,
                materiales: [...((c.materiales as any[]) || []), material],
              }
            : c,
        );
        return { ...s, materials, catalogs };
      });
      return true;
    } catch (error) {
      console.error("[useMaterials] Error adding material:", error);
      throw error;
    }
  };

  const registerNewCategory = (
    categoria: string,
    productoId: string,
    material: any,
  ) => {
    setStoreState((s) => {
      const rawCategories = s.rawCategories.some(
        (c) => c.categoria === categoria,
      )
        ? s.rawCategories
        : [...s.rawCategories, { id: productoId, categoria }];
      const categories = s.categories.includes(categoria)
        ? s.categories
        : [...s.categories, categoria];

      const existsInCatalog = s.catalogs.some(
        (c) => c.id === productoId || c.categoria === categoria,
      );
      const catalogs = existsInCatalog
        ? s.catalogs.map((c) => {
            if (c.id !== productoId && c.categoria !== categoria) return c;
            const materiales = [...((c.materiales as any[]) || [])];
            const hasMaterial = materiales.some(
              (m) => String(m.codigo) === String(material.codigo),
            );
            if (!hasMaterial) materiales.push(material);
            return { ...c, categoria, materiales };
          })
        : ([
            ...s.catalogs,
            { id: productoId, categoria, materiales: [material] } as any,
          ] as BackendCatalogoProductos[]);

      const exists = s.materials.some(
        (m) =>
          String(m.codigo) === String(material.codigo) &&
          m.categoria === categoria,
      );
      const materials = exists
        ? s.materials
        : [
            {
              id: `${productoId}_${material.codigo}`,
              codigo: material.codigo,
              descripcion: material.descripcion,
              um: material.um,
              precio: material.precio,
              ubicacion_en_almacen: material.ubicacion_en_almacen ?? null,
              comentario: material.comentario ?? null,
              categoria,
              nombre: material.nombre,
              foto: material.foto,
              marca_id: material.marca_id,
              potenciaKW: material.potenciaKW,
              habilitar_venta_web: material.habilitar_venta_web,
              precio_por_cantidad: material.precio_por_cantidad,
              especificaciones: material.especificaciones,
              ficha_tecnica_url: material.ficha_tecnica_url,
              numero_serie: material.numero_serie ?? null,
              stockaje_minimo: material.stockaje_minimo ?? null,
              producto_id: productoId,
            } as Material,
            ...s.materials,
          ];

      return { ...s, rawCategories, categories, catalogs, materials };
    });
  };

  const editMaterialInProduct = async (
    productoId: string,
    materialCodigo: string,
    data: any,
    categoria?: string,
  ) => {
    try {
      const payload = { ...data, codigo: String(data.codigo) };
      const ok = await MaterialService.editMaterialInProduct(
        productoId,
        String(materialCodigo),
        payload,
      );
      if (!ok) throw new Error("Error al actualizar el material");

      setStoreState((s) => {
        const materials = s.materials.map((mat) => {
          const m = mat as any;
          const sameCode = String(m.codigo) === String(materialCodigo);
          const sameCategory = categoria ? m.categoria === categoria : true;
          if (!sameCode || !sameCategory) return mat;
          return {
            ...m,
            codigo: String(payload.codigo),
            descripcion: payload.descripcion,
            um: payload.um,
            precio: payload.precio ?? m.precio,
            ubicacion_en_almacen:
              payload.ubicacion_en_almacen !== undefined
                ? payload.ubicacion_en_almacen
                : m.ubicacion_en_almacen,
            comentario:
              payload.comentario !== undefined
                ? payload.comentario
                : m.comentario,
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
            ficha_tecnica_url:
              payload.ficha_tecnica_url !== undefined
                ? payload.ficha_tecnica_url
                : m.ficha_tecnica_url,
            numero_serie:
              payload.numero_serie !== undefined
                ? payload.numero_serie
                : m.numero_serie,
            stockaje_minimo:
              payload.stockaje_minimo !== undefined
                ? payload.stockaje_minimo
                : m.stockaje_minimo,
          } as Material;
        });
        const catalogs = s.catalogs.map((c) =>
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
        );
        return { ...s, materials, catalogs };
      });
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
      if (!ok) throw new Error("Error al eliminar el material");

      setStoreState((s) => {
        const materials = s.materials.filter((m) => {
          const sameCode = String(m.codigo) === String(materialCodigo);
          if (!sameCode) return true;
          return categoria ? m.categoria !== categoria : false;
        });
        const catalogs = s.catalogs.map((c) => ({
          ...c,
          materiales: ((c.materiales as any[]) || []).filter(
            (mat) => String(mat.codigo) !== String(materialCodigo),
          ),
        }));
        return { ...s, materials, catalogs };
      });
      return true;
    } catch (error) {
      console.error("[useMaterials] Error deleting material:", error);
      throw error;
    }
  };

  return {
    materials: snapshot.materials,
    categories: snapshot.categories,
    catalogs: snapshot.catalogs,
    loading: snapshot.loading,
    hasAnyCategoryLoaded: snapshot.loadedCategories.size > 0,
    loadedCategories: snapshot.loadedCategories,
    loadingCategories: snapshot.loadingCategories,
    error: snapshot.error,
    refetch: store.forceRefetch,
    refetchBackground: () => store.fetchAll(true),
    loadCategoryMaterials: store.loadCategoryMaterials,
    ensureCategoriesList: store.ensureCategoriesList,
    registerNewCategory,
    createCategory,
    createProduct,
    addMaterialToProduct,
    deleteMaterialByCodigo,
    editMaterialInProduct,
  };
}
