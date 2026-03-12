import { useState, useEffect, useCallback, useMemo } from "react";
import { SolicitudVentaService } from "@/lib/api-services";
import type {
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaListParams,
  SolicitudVentaUpdateData,
} from "@/lib/api-types";

interface UseSolicitudesVentasReturn {
  solicitudes: SolicitudVenta[];
  filteredSolicitudes: SolicitudVenta[];
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
  deleteSolicitud: (id: string) => Promise<boolean>;
  clearError: () => void;
}

const normalizeText = (value?: string): string =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function useSolicitudesVentas(): UseSolicitudesVentasReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFiltersState] = useState<SolicitudVentaListParams>({
    skip: 0,
    limit: 500,
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
        const data = await SolicitudVentaService.getSolicitudes(finalFilters);
        setSolicitudes(data);
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
        solicitud.cliente_venta?.numero,
        solicitud.cliente_venta?.nombre,
        solicitud.cliente_venta?.telefono,
        solicitud.cliente_venta?.ci,
        solicitud.almacen?.nombre,
        solicitud.trabajador?.nombre,
        solicitud.trabajador?.ci,
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

  const deleteSolicitud = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await SolicitudVentaService.deleteSolicitud(id);
        await loadSolicitudes();
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al eliminar solicitud de venta";
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
    deleteSolicitud,
    clearError,
  };
}
