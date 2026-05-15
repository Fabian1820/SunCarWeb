import { useState, useEffect, useRef, useCallback } from "react";
import { InventarioService } from "@/lib/api-services";
import type {
  MaterialStockItem,
  AlmacenDisponibleItem,
  MaterialesStockParams,
} from "@/lib/inventario-types";

export type MaterialesStockSortBy = NonNullable<MaterialesStockParams["sort_by"]>;
export type MaterialesStockSortDir = NonNullable<MaterialesStockParams["sort_dir"]>;
export type MaterialesStockCantidadFilter = NonNullable<
  MaterialesStockParams["cantidad_filter"]
>;

export interface MaterialesStockFilters {
  q: string;
  categoria: string; // "all" | nombre exacto
  marca_id: string; // "all" | ObjectId
  potencia_kw: string; // "all" | valor
  almacen_id: string; // "all" | ObjectId
  cantidad_filter: MaterialesStockCantidadFilter;
}

export interface MaterialesStockMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  skip: number;
}

export interface MaterialesStockSort {
  sort_by: MaterialesStockSortBy;
  sort_dir: MaterialesStockSortDir;
}

interface UseMaterialesStockReturn {
  data: MaterialStockItem[];
  almacenesDisponibles: AlmacenDisponibleItem[];
  loading: boolean;
  error: string | null;
  meta: MaterialesStockMeta;
  filters: MaterialesStockFilters;
  sort: MaterialesStockSort;
  setFilters: (patch: Partial<MaterialesStockFilters>) => void;
  setSort: (patch: Partial<MaterialesStockSort>) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

const DEFAULT_LIMIT = 50;

const DEFAULT_FILTERS: MaterialesStockFilters = {
  q: "",
  categoria: "all",
  marca_id: "all",
  potencia_kw: "all",
  almacen_id: "all",
  cantidad_filter: "all",
};

const DEFAULT_SORT: MaterialesStockSort = {
  sort_by: "nombre",
  sort_dir: "asc",
};

const DEFAULT_META: MaterialesStockMeta = {
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  totalPages: 0,
  skip: 0,
};

export function useMaterialesStock(): UseMaterialesStockReturn {
  const [data, setData] = useState<MaterialStockItem[]>([]);
  const [almacenesDisponibles, setAlmacenesDisponibles] = useState<
    AlmacenDisponibleItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MaterialesStockMeta>(DEFAULT_META);
  const [filters, setFiltersState] =
    useState<MaterialesStockFilters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<MaterialesStockSort>(DEFAULT_SORT);
  const [page, setPageState] = useState(1);

  // Debounce solo el text search; el resto aplica de inmediato.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(filters.q);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters.q]);

  const fetchRef = useRef(0);

  const fetchData = useCallback(
    async (
      currentFilters: MaterialesStockFilters,
      currentSort: MaterialesStockSort,
      currentPage: number,
      currentDebouncedQ: string,
    ) => {
      const fetchId = ++fetchRef.current;
      setLoading(true);
      setError(null);

      try {
        const skip = (currentPage - 1) * DEFAULT_LIMIT;
        const params: MaterialesStockParams = {
          skip,
          limit: DEFAULT_LIMIT,
          sort_by: currentSort.sort_by,
          sort_dir: currentSort.sort_dir,
        };

        if (currentDebouncedQ.trim()) params.q = currentDebouncedQ.trim();
        if (currentFilters.categoria !== "all")
          params.categoria = currentFilters.categoria;
        if (currentFilters.marca_id !== "all")
          params.marca_id = currentFilters.marca_id;
        if (currentFilters.potencia_kw !== "all")
          params.potencia_kw = currentFilters.potencia_kw;
        if (currentFilters.almacen_id !== "all")
          params.almacen_id = currentFilters.almacen_id;
        if (currentFilters.cantidad_filter !== "all")
          params.cantidad_filter = currentFilters.cantidad_filter;

        const result = await InventarioService.getMaterialesStock(params);

        if (fetchRef.current !== fetchId) return;

        setData(result.data);
        setAlmacenesDisponibles(result.almacenes_disponibles);
        const totalPages =
          result.limit > 0 ? Math.ceil(result.total / result.limit) : 0;
        setMeta({
          total: result.total,
          page: currentPage,
          limit: result.limit || DEFAULT_LIMIT,
          totalPages,
          skip: result.skip,
        });
      } catch (err) {
        if (fetchRef.current !== fetchId) return;
        setError(
          err instanceof Error ? err.message : "Error al cargar materiales con stock",
        );
        setData([]);
      } finally {
        if (fetchRef.current === fetchId) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(filters, sort, page, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.categoria,
    filters.marca_id,
    filters.potencia_kw,
    filters.almacen_id,
    filters.cantidad_filter,
    sort.sort_by,
    sort.sort_dir,
    page,
    debouncedQ,
    fetchData,
  ]);

  const setFilters = useCallback((patch: Partial<MaterialesStockFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPageState(1);
  }, []);

  const setSort = useCallback((patch: Partial<MaterialesStockSort>) => {
    setSortState((prev) => ({ ...prev, ...patch }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const refetch = useCallback(() => {
    fetchData(filters, sort, page, debouncedQ);
  }, [fetchData, filters, sort, page, debouncedQ]);

  return {
    data,
    almacenesDisponibles,
    loading,
    error,
    meta,
    filters,
    sort,
    setFilters,
    setSort,
    setPage,
    refetch,
  };
}
