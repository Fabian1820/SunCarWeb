import { useCallback, useEffect, useState } from "react";
import { CompraService } from "@/lib/api-services";
import type {
  CancelarCompraRequest,
  Compra,
  CompraCreateData,
  EstadoCompra,
  TipoCompra,
} from "@/lib/types/feats/compras/compra-types";

const PAGE_SIZE_DEFAULT = 20;

type PagadoFilter = "todos" | "pagado" | "pendiente";

interface ComprasFilters {
  estado: "todos" | EstadoCompra;
  tipo: "todos" | TipoCompra;
  pagado: PagadoFilter;
  skip: number;
  limit: number;
}

interface UseComprasReturn {
  compras: Compra[];
  total: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  initialLoading: boolean;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  cancelling: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  estadoFilter: "todos" | EstadoCompra;
  setEstadoFilter: (value: "todos" | EstadoCompra) => void;
  tipoFilter: "todos" | TipoCompra;
  setTipoFilter: (value: "todos" | TipoCompra) => void;
  pagadoFilter: PagadoFilter;
  setPagadoFilter: (value: PagadoFilter) => void;
  loadCompras: () => Promise<void>;
  createCompra: (data: CompraCreateData) => Promise<Compra>;
  updateCompra: (id: string, data: Partial<CompraCreateData>) => Promise<Compra>;
  deleteCompra: (id: string) => Promise<void>;
  cancelarCompra: (id: string, payload?: CancelarCompraRequest) => Promise<Compra>;
  clearError: () => void;
}

export function useCompras(): UseComprasReturn {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState<ComprasFilters>({
    estado: "todos",
    tipo: "todos",
    pagado: "todos",
    skip: 0,
    limit: PAGE_SIZE_DEFAULT,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadCompras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { compras: data, total: totalCompras } = await CompraService.getComprasPaginadas({
        q: debouncedSearchTerm || undefined,
        estado: filters.estado !== "todos" ? filters.estado : undefined,
        tipo: filters.tipo !== "todos" ? filters.tipo : undefined,
        pagado: filters.pagado === "todos" ? undefined : filters.pagado === "pagado",
        skip: filters.skip,
        limit: filters.limit,
      });
      setCompras(data);
      setTotal(totalCompras);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las compras");
      setCompras([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [debouncedSearchTerm, filters]);

  useEffect(() => {
    void loadCompras();
  }, [loadCompras]);

  // Cualquier cambio de filtro o de búsqueda vuelve a la primera página: si no,
  // el usuario se queda mirando una página que ya no existe en el nuevo total.
  const setEstadoFilter = useCallback((value: "todos" | EstadoCompra) => {
    setFilters((prev) => ({ ...prev, estado: value, skip: 0 }));
  }, []);

  const setTipoFilter = useCallback((value: "todos" | TipoCompra) => {
    setFilters((prev) => ({ ...prev, tipo: value, skip: 0 }));
  }, []);

  const setPagadoFilter = useCallback((value: PagadoFilter) => {
    setFilters((prev) => ({ ...prev, pagado: value, skip: 0 }));
  }, []);

  const handleSetSearchTerm = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setFilters((prev) => (prev.skip === 0 ? prev : { ...prev, skip: 0 }));
    },
    [],
  );

  const setPage = useCallback((nextPage: number) => {
    setFilters((prev) => ({ ...prev, skip: Math.max(nextPage - 1, 0) * prev.limit }));
  }, []);

  const createCompra = useCallback(
    async (data: CompraCreateData) => {
      setCreating(true);
      setError(null);
      try {
        const created = await CompraService.createCompra(data);
        // La compra nueva puede caer en cualquier página según su fecha de
        // llegada, así que se recarga en vez de insertarla a mano.
        await loadCompras();
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo registrar la compra";
        setError(message);
        throw new Error(message);
      } finally {
        setCreating(false);
      }
    },
    [loadCompras],
  );

  const updateCompra = useCallback(async (id: string, data: Partial<CompraCreateData>) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await CompraService.updateCompra(id, data);
      setCompras((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar la compra";
      setError(message);
      throw new Error(message);
    } finally {
      setUpdating(false);
    }
  }, []);

  const deleteCompra = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await CompraService.deleteCompra(id);
        await loadCompras();
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo eliminar la compra";
        setError(message);
        throw new Error(message);
      }
    },
    [loadCompras],
  );

  const cancelarCompra = useCallback(
    async (id: string, payload: CancelarCompraRequest = {}) => {
      setCancelling(true);
      setError(null);
      try {
        const updated = await CompraService.cancelarCompra(id, payload);
        setCompras((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo cancelar la compra";
        setError(message);
        throw new Error(message);
      } finally {
        setCancelling(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const pageSize = filters.limit;
  const page = pageSize > 0 ? Math.floor(filters.skip / pageSize) + 1 : 1;

  return {
    compras,
    total,
    page,
    pageSize,
    setPage,
    initialLoading,
    loading,
    creating,
    updating,
    cancelling,
    error,
    searchTerm,
    setSearchTerm: handleSetSearchTerm,
    estadoFilter: filters.estado,
    setEstadoFilter,
    tipoFilter: filters.tipo,
    setTipoFilter,
    pagadoFilter: filters.pagado,
    setPagadoFilter,
    loadCompras,
    createCompra,
    updateCompra,
    deleteCompra,
    cancelarCompra,
    clearError,
  };
}
