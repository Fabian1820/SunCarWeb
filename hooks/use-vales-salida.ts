import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ValeSalidaService } from "@/lib/api-services";
import type {
  ValeSalida,
  ValeSalidaCreateData,
  ValeSalidaSummary,
} from "@/lib/api-types";

interface UseValesSalidaReturn {
  vales: ValeSalidaSummary[];
  filteredVales: ValeSalidaSummary[];
  loading: boolean;
  isSearching: boolean; // Nueva bandera para indicar búsqueda en progreso
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  estadoFilter: "todos" | "usado" | "anulado";
  setEstadoFilter: (estado: "todos" | "usado" | "anulado") => void;
  loadVales: () => Promise<void>;
  loadMore: () => Promise<void>; // Nueva función para cargar más
  hasMore: boolean; // Indica si hay más registros por cargar
  createVale: (data: ValeSalidaCreateData) => Promise<ValeSalida>;
  anularVale: (id: string, motivoAnulacion: string) => Promise<boolean>;
  clearError: () => void;
  total: number;
}

export function useValesSalida(): UseValesSalidaReturn {
  const [vales, setVales] = useState<ValeSalidaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0); // Contador de registros cargados
  const [hasMore, setHasMore] = useState(true); // Hay más registros por cargar
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // Búsqueda en progreso
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | "usado" | "anulado"
  >("todos");

  // Ref para evitar recrear loadVales en cada render
  const isFirstRender = useRef(true);

  const loadVales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        estado?: string;
        q?: string;
        skip?: number;
        limit?: number;
      } = estadoFilter === "todos" ? {} : { estado: estadoFilter };

      // Paginación: cargar los primeros 100
      params.skip = 0;
      params.limit = 100;

      // Si hay un término de búsqueda, agregarlo como 'q' (búsqueda de texto libre)
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }

      const response = await ValeSalidaService.getValesSummary(params);

      // REEMPLAZAR vales (no concatenar)
      setVales(response.data || []);
      setTotal(response.total || 0);
      setSkip(100); // Ya cargamos los primeros 100
      setHasMore((response.data?.length || 0) < (response.total || 0)); // Hay más si no cargamos todo
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los vales de salida",
      );
      setVales([]);
      setTotal(0);
      setSkip(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, searchTerm]);

  // Ahora filteredVales es igual a vales ya que el filtrado lo hace el backend
  const filteredVales = vales;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return; // No cargar si ya está cargando o no hay más

    setLoading(true);
    setError(null);
    try {
      const params: {
        estado?: string;
        q?: string;
        skip?: number;
        limit?: number;
      } = estadoFilter === "todos" ? {} : { estado: estadoFilter };

      // Paginación: cargar siguientes 100 desde skip
      params.skip = skip;
      params.limit = 100;

      // Si hay búsqueda, mantenerla
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }

      const response = await ValeSalidaService.getValesSummary(params);

      // CONCATENAR nuevos vales al array existente
      const newVales = [...vales, ...response.data];
      setVales(newVales);
      setTotal(response.total);
      const newSkip = skip + 100;
      setSkip(newSkip);
      setHasMore(newVales.length < response.total); // Usar el array actualizado
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar más vales de salida",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, skip, estadoFilter, searchTerm, vales.length]);

  const createVale = useCallback(
    async (data: ValeSalidaCreateData): Promise<ValeSalida> => {
      setLoading(true);
      setError(null);
      try {
        const response = await ValeSalidaService.createVale(data);
        await loadVales();
        return response;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Error al crear el vale de salida";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadVales],
  );

  const anularVale = useCallback(
    async (id: string, motivoAnulacion: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ValeSalidaService.anularVale(id, {
          motivo_anulacion: motivoAnulacion,
        });
        await loadVales();
        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al anular el vale";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadVales],
  );

  const clearError = useCallback(() => setError(null), []);

  // Debounce para la búsqueda: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    // Saltar el primer render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void loadVales(); // Cargar inmediatamente en el primer render
      return;
    }

    // Activar indicador de búsqueda
    setIsSearching(true);

    const timer = setTimeout(() => {
      void loadVales().finally(() => {
        setIsSearching(false); // Desactivar indicador cuando termine
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      setIsSearching(false); // Limpiar indicador si se cancela
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFilter, searchTerm]); // Solo depende de filtros y búsqueda, NO de loadVales

  return {
    vales,
    filteredVales,
    loading,
    isSearching, // Nueva bandera
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    loadVales,
    loadMore, // Nueva función
    hasMore, // Nuevo flag
    createVale,
    anularVale,
    clearError,
    total,
  };
}
