import { useState, useEffect, useRef, useCallback } from "react";
import { MaterialService } from "@/lib/api-services";
import type { Material } from "@/lib/material-types";

export interface PaginatedMaterialsFilters {
  q: string;
  categoria: string;  // "all" | nombre exacto
  marca_id: string;   // "all" | ObjectId
  precio_zero: boolean;
}

interface PaginatedMaterialsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsePaginatedMaterialsReturn {
  materials: Material[];
  loading: boolean;
  error: string | null;
  meta: PaginatedMaterialsMeta;
  filters: PaginatedMaterialsFilters;
  setFilters: (patch: Partial<PaginatedMaterialsFilters>) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

const DEFAULT_LIMIT = 50;

const DEFAULT_FILTERS: PaginatedMaterialsFilters = {
  q: "",
  categoria: "all",
  marca_id: "all",
  precio_zero: false,
};

const DEFAULT_META: PaginatedMaterialsMeta = {
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  totalPages: 0,
};

export function usePaginatedMaterials(): UsePaginatedMaterialsReturn {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginatedMaterialsMeta>(DEFAULT_META);
  const [filters, setFiltersState] = useState<PaginatedMaterialsFilters>(DEFAULT_FILTERS);
  const [page, setPageState] = useState(1);

  // Debounce only the text search — other filters apply immediately
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

  const fetchData = useCallback(async (
    currentFilters: PaginatedMaterialsFilters,
    currentPage: number,
    currentDebouncedQ: string,
  ) => {
    const fetchId = ++fetchRef.current;
    setLoading(true);
    setError(null);

    try {
      const params: Parameters<typeof MaterialService.getCatalogoAdmin>[0] = {
        page: currentPage,
        limit: DEFAULT_LIMIT,
        sort: "categoria,nombre",
      };

      if (currentDebouncedQ.trim()) params.q = currentDebouncedQ.trim();
      if (currentFilters.categoria !== "all") params.categoria = currentFilters.categoria;
      if (currentFilters.marca_id !== "all") params.marca_id = currentFilters.marca_id;
      if (currentFilters.precio_zero) params.precio_zero = true;

      const result = await MaterialService.getCatalogoAdmin(params);

      if (fetchRef.current !== fetchId) return; // stale response

      setMaterials(result.data);
      setMeta(result.meta);
    } catch (err) {
      if (fetchRef.current !== fetchId) return;
      setError(err instanceof Error ? err.message : "Error al cargar materiales");
    } finally {
      if (fetchRef.current === fetchId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters, page, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.categoria, filters.marca_id, filters.precio_zero, page, debouncedQ, fetchData]);

  const setFilters = useCallback((patch: Partial<PaginatedMaterialsFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    // Reset to page 1 on any filter change
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const refetch = useCallback(() => {
    fetchData(filters, page, debouncedQ);
  }, [fetchData, filters, page, debouncedQ]);

  return {
    materials,
    loading,
    error,
    meta,
    filters,
    setFilters,
    setPage,
    refetch,
  };
}
