import { useState, useEffect, useCallback, useMemo } from "react";
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
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: SolicitudVentaListParams;
  setFilters: (filters: SolicitudVentaListParams) => void;
  loadSolicitudes: (
    overrideFilters?: SolicitudVentaListParams,
  ) => Promise<void>;
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

const normalizeText = (value?: string): string =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function useSolicitudesVentas(): UseSolicitudesVentasReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudVentaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFiltersState] = useState<SolicitudVentaListParams>({
    skip: 0,
    // TEMPORAL: Sin límite para debugging
    // limit: 1000,
  });

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

      try {
        const response =
          await SolicitudVentaService.getSolicitudesSummary(finalFilters);
        setSolicitudes(response.data);
        setTotal(response.total);
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
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const filteredSolicitudes = useMemo(() => {
    const term = normalizeText(searchTerm);
    if (!term) return solicitudes;

    return solicitudes.filter((solicitud) => {
      const searchIndex = [
        solicitud.codigo,
        solicitud.estado,
        solicitud.cliente_venta_nombre,
        solicitud.almacen_nombre,
        solicitud.creador_nombre,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      return searchIndex.includes(term);
    });
  }, [solicitudes, searchTerm]);

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

  useEffect(() => {
    void loadSolicitudes({ skip: 0, limit: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    solicitudes,
    filteredSolicitudes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    loadSolicitudes,
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
    clearError,
    total,
  };
}
