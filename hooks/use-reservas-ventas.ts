import { useState, useEffect, useCallback, useMemo } from "react";
import { ReservaVentaService } from "@/lib/api-services";
import type {
  Reserva,
  ReservaConsumirData,
  ReservaCreateData,
  ReservaListParams,
  ReservaUpdateData,
} from "@/lib/api-types";

interface UseReservasVentasReturn {
  reservas: Reserva[];
  filteredReservas: Reserva[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: ReservaListParams;
  setFilters: (filters: Partial<ReservaListParams>) => void;
  total: number;
  loadReservas: () => Promise<void>;
  createReserva: (data: ReservaCreateData) => Promise<Reserva>;
  updateReserva: (id: string, data: ReservaUpdateData) => Promise<Reserva>;
  cancelarReserva: (id: string) => Promise<Reserva>;
  consumirReserva: (id: string, data: ReservaConsumirData) => Promise<Reserva>;
  clearError: () => void;
}

const normalizeText = (value: string | undefined | null): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function useReservasVentas(): UseReservasVentasReturn {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFiltersState] = useState<ReservaListParams>({
    origen: "ventas",
    skip: 0,
    limit: 100,
  });

  const setFilters = useCallback((nextFilters: Partial<ReservaListParams>) => {
    setFiltersState((prev) => ({ ...prev, ...nextFilters }));
  }, []);

  const loadReservas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, total: t } = await ReservaVentaService.getReservas(filters);
      setReservas(data);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const filteredReservas = useMemo(() => {
    if (!searchTerm.trim()) return reservas;
    const term = normalizeText(searchTerm);
    return reservas.filter((r) => {
      return (
        normalizeText(r.reserva_id).includes(term) ||
        normalizeText(r.cliente_nombre).includes(term) ||
        normalizeText(r.almacen_nombre).includes(term) ||
        normalizeText(r.estado).includes(term) ||
        normalizeText(r.cliente_id).includes(term)
      );
    });
  }, [reservas, searchTerm]);

  const createReserva = useCallback(
    async (data: ReservaCreateData): Promise<Reserva> => {
      const result = await ReservaVentaService.createReserva(data);
      await loadReservas();
      return result;
    },
    [loadReservas],
  );

  const updateReserva = useCallback(
    async (id: string, data: ReservaUpdateData): Promise<Reserva> => {
      const result = await ReservaVentaService.updateReserva(id, data);
      await loadReservas();
      return result;
    },
    [loadReservas],
  );

  const cancelarReserva = useCallback(
    async (id: string): Promise<Reserva> => {
      const result = await ReservaVentaService.cancelarReserva(id);
      await loadReservas();
      return result;
    },
    [loadReservas],
  );

  const consumirReserva = useCallback(
    async (id: string, data: ReservaConsumirData): Promise<Reserva> => {
      const result = await ReservaVentaService.consumirReserva(id, data);
      await loadReservas();
      return result;
    },
    [loadReservas],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadReservas();
  }, [loadReservas]);

  return {
    reservas,
    filteredReservas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    total,
    loadReservas,
    createReserva,
    updateReserva,
    cancelarReserva,
    consumirReserva,
    clearError,
  };
}
