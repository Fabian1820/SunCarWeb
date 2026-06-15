import { useState, useEffect, useRef, useCallback } from "react";
import { SolicitudVentaService } from "@/lib/api-services";
import type { VentasFacturaRow } from "@/lib/types/feats/solicitudes-ventas/solicitud-venta-types";

export interface VentasFacturaFilters {
  q: string;
}

interface VentasFacturaMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsePaginatedVentasFacturaReturn {
  rows: VentasFacturaRow[];
  loading: boolean;
  error: string | null;
  meta: VentasFacturaMeta;
  filters: VentasFacturaFilters;
  setFilters: (patch: Partial<VentasFacturaFilters>) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

const DEFAULT_LIMIT = 50;

const DEFAULT_FILTERS: VentasFacturaFilters = { q: "" };

const DEFAULT_META: VentasFacturaMeta = {
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  totalPages: 0,
};

export function usePaginatedVentasFactura(): UsePaginatedVentasFacturaReturn {
  const [rows, setRows] = useState<VentasFacturaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VentasFacturaMeta>(DEFAULT_META);
  const [filters, setFiltersState] = useState<VentasFacturaFilters>(DEFAULT_FILTERS);
  const [page, setPageState] = useState(1);

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
      currentFilters: VentasFacturaFilters,
      currentPage: number,
      currentDebouncedQ: string,
    ) => {
      const fetchId = ++fetchRef.current;
      setLoading(true);
      setError(null);

      try {
        const skip = (currentPage - 1) * DEFAULT_LIMIT;
        const { data, total } = await SolicitudVentaService.getResumenFactura({
          skip,
          limit: DEFAULT_LIMIT,
          q: currentDebouncedQ.trim() || undefined,
        });

        if (fetchRef.current !== fetchId) return;

        const totalPages = Math.ceil(total / DEFAULT_LIMIT);
        setRows(data);
        setMeta({ total, page: currentPage, limit: DEFAULT_LIMIT, totalPages });
      } catch (err) {
        if (fetchRef.current !== fetchId) return;
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        if (fetchRef.current === fetchId) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(filters, page, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, fetchData]);

  const setFilters = useCallback((patch: Partial<VentasFacturaFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const refetch = useCallback(() => {
    fetchData(filters, page, debouncedQ);
  }, [fetchData, filters, page, debouncedQ]);

  return { rows, loading, error, meta, filters, setFilters, setPage, refetch };
}
