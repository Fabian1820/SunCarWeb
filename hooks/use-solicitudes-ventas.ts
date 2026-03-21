import { useState, useEffect, useCallback, useRef } from "react";
import { SolicitudVentaService } from "@/lib/api-services";
import type {
  SolicitudVenta,
  SolicitudVentaAnularData,
  SolicitudVentaCreateData,
  SolicitudVentaListParams,
  SolicitudVentaUpdateData,
  SolicitudVentaSummary,
} from "@/lib/api-types";

interface UseSolicitudesVentasReturn {
  solicitudes: SolicitudVentaSummary[];
  filteredSolicitudes: SolicitudVentaSummary[];
  loading: boolean;
  isSearching: boolean; // Nueva bandera para indicar búsqueda en progreso
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: SolicitudVentaListParams;
  setFilters: (filters: SolicitudVentaListParams) => void;
  loadSolicitudes: (
    overrideFilters?: SolicitudVentaListParams,
  ) => Promise<void>;
  loadMore: () => Promise<void>; // Nueva función para cargar más
  hasMore: boolean; // Indica si hay más registros por cargar
  createSolicitud: (data: SolicitudVentaCreateData) => Promise<SolicitudVenta>;
  updateSolicitud: (
    id: string,
    data: SolicitudVentaUpdateData,
    usePut?: boolean,
  ) => Promise<SolicitudVenta>;
  anularSolicitud: (
    id: string,
    data: SolicitudVentaAnularData,
  ) => Promise<SolicitudVenta>;
  reabrirSolicitud: (id: string) => Promise<SolicitudVenta>;
  clearError: () => void;
  total: number;
}

export function useSolicitudesVentas(): UseSolicitudesVentasReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudVentaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0); // Contador de registros cargados
  const [hasMore, setHasMore] = useState(true); // Hay más registros por cargar
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // Búsqueda en progreso
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFiltersState] = useState<SolicitudVentaListParams>({
    skip: 0,
    // TEMPORAL: Sin límite para debugging
    // limit: 1000,
  });

  // Ref para evitar recrear loadSolicitudes en cada render
  const isFirstRender = useRef(true);

  const setFilters = useCallback((nextFilters: SolicitudVentaListParams) => {
    setFiltersState((prev) => ({
      ...prev,
      ...nextFilters,
      skip: nextFilters.skip ?? 0,
    }));
  }, []);

  const loadSolicitudes = useCallback(
    async (overrideFilters?: SolicitudVentaListParams) => {
      setLoading(true);
      setError(null);

      const finalFilters: SolicitudVentaListParams = {
        ...filters,
        ...(overrideFilters || {}),
      };

      // Paginación: cargar los primeros 100
      finalFilters.skip = 0;
      finalFilters.limit = 100;

      // Si hay un término de búsqueda, agregarlo como 'q' (búsqueda de texto libre)
      if (searchTerm.trim()) {
        finalFilters.q = searchTerm.trim();
      }

      try {
        const response =
          await SolicitudVentaService.getSolicitudesSummary(finalFilters);

        // REEMPLAZAR solicitudes (no concatenar)
        setSolicitudes(response.data || []);
        setTotal(response.total || 0);
        setSkip(100); // Ya cargamos los primeros 100
        setHasMore((response.data?.length || 0) < (response.total || 0)); // Hay más si no cargamos todo

        if (overrideFilters) {
          setFiltersState(finalFilters);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar solicitudes de ventas",
        );
        setSolicitudes([]);
        setTotal(0);
        setSkip(0);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [filters, searchTerm],
  );

  // Ahora filteredSolicitudes es igual a solicitudes ya que el filtrado lo hace el backend
  const filteredSolicitudes = solicitudes;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return; // No cargar si ya está cargando o no hay más

    setLoading(true);
    setError(null);
    try {
      const finalFilters: SolicitudVentaListParams = {
        ...filters,
      };

      // Paginación: cargar siguientes 100 desde skip
      finalFilters.skip = skip;
      finalFilters.limit = 100;

      // Si hay búsqueda, mantenerla
      if (searchTerm.trim()) {
        finalFilters.q = searchTerm.trim();
      }

      const response =
        await SolicitudVentaService.getSolicitudesSummary(finalFilters);

      // CONCATENAR nuevas solicitudes al array existente
      const newSolicitudes = [...solicitudes, ...response.data];
      setSolicitudes(newSolicitudes);
      setTotal(response.total);
      const newSkip = skip + 100;
      setSkip(newSkip);
      setHasMore(newSolicitudes.length < response.total); // Usar el array actualizado
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar más solicitudes de ventas",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, skip, filters, searchTerm, solicitudes]);

  const createSolicitud = useCallback(
    async (data: SolicitudVentaCreateData): Promise<SolicitudVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudVentaService.createSolicitud(data);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al crear solicitud de venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const updateSolicitud = useCallback(
    async (
      id: string,
      data: SolicitudVentaUpdateData,
      usePut = false,
    ): Promise<SolicitudVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = usePut
          ? await SolicitudVentaService.putSolicitud(id, data)
          : await SolicitudVentaService.patchSolicitud(id, data);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al actualizar solicitud de venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const anularSolicitud = useCallback(
    async (
      id: string,
      data: SolicitudVentaAnularData,
    ): Promise<SolicitudVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudVentaService.anularSolicitud(id, data);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al anular solicitud de venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const reabrirSolicitud = useCallback(
    async (id: string): Promise<SolicitudVenta> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudVentaService.reabrirSolicitud(id);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al reabrir solicitud de venta";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const clearError = useCallback(() => setError(null), []);

  // Debounce para la búsqueda: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    // Saltar el primer render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void loadSolicitudes(); // Cargar inmediatamente en el primer render (con límite 100)
      return;
    }

    // Activar indicador de búsqueda
    setIsSearching(true);

    const timer = setTimeout(() => {
      void loadSolicitudes().finally(() => {
        setIsSearching(false); // Desactivar indicador cuando termine
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      setIsSearching(false); // Limpiar indicador si se cancela
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Solo depende de searchTerm, NO de loadSolicitudes

  return {
    solicitudes,
    filteredSolicitudes,
    loading,
    isSearching, // Nueva bandera
    error,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    loadSolicitudes,
    loadMore, // Nueva función
    hasMore, // Nuevo flag
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
    clearError,
    total,
  };
}
