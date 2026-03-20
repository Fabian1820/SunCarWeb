import { useState, useEffect, useCallback, useMemo } from "react";
import { SolicitudMaterialService } from "@/lib/api-services";
import type {
  SolicitudMaterial,
  SolicitudMaterialAnularData,
  SolicitudMaterialCreateData,
  SolicitudMaterialUpdateData,
  SolicitudMaterialSummary,
} from "@/lib/api-types";

interface UseSolicitudesMaterialesReturn {
  solicitudes: SolicitudMaterialSummary[];
  filteredSolicitudes: SolicitudMaterialSummary[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loadSolicitudes: () => Promise<void>;
  createSolicitud: (
    data: SolicitudMaterialCreateData,
  ) => Promise<SolicitudMaterial>;
  updateSolicitud: (
    id: string,
    data: SolicitudMaterialUpdateData,
  ) => Promise<boolean>;
  anularSolicitud: (
    id: string,
    data: SolicitudMaterialAnularData,
  ) => Promise<SolicitudMaterial>;
  reabrirSolicitud: (id: string) => Promise<SolicitudMaterial>;
  clearError: () => void;
  total: number;
}

export function useSolicitudesMateriales(): UseSolicitudesMaterialesReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterialSummary[]>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await SolicitudMaterialService.getSolicitudesSummary({
        // TEMPORAL: Sin límite para debugging
        // limit: 1000,
      });
      setSolicitudes(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las solicitudes",
      );
      setSolicitudes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredSolicitudes = useMemo(() => {
    if (!searchTerm.trim()) return solicitudes;

    const term = searchTerm.toLowerCase();
    return solicitudes.filter((s) => {
      return (
        s.codigo?.toLowerCase().includes(term) ||
        s.cliente_nombre?.toLowerCase().includes(term) ||
        s.almacen_nombre?.toLowerCase().includes(term) ||
        s.creador_nombre?.toLowerCase().includes(term) ||
        s.responsable_recogida?.toLowerCase().includes(term) ||
        s.fecha_recogida?.toLowerCase().includes(term)
      );
    });
  }, [solicitudes, searchTerm]);

  const createSolicitud = useCallback(
    async (data: SolicitudMaterialCreateData): Promise<SolicitudMaterial> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudMaterialService.createSolicitud(data);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al crear la solicitud";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const updateSolicitud = useCallback(
    async (id: string, data: SolicitudMaterialUpdateData): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await SolicitudMaterialService.updateSolicitud(id, data);
        await loadSolicitudes();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al actualizar la solicitud",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const anularSolicitud = useCallback(
    async (
      id: string,
      data: SolicitudMaterialAnularData,
    ): Promise<SolicitudMaterial> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudMaterialService.anularSolicitud(id, data);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al anular la solicitud";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const reabrirSolicitud = useCallback(
    async (id: string): Promise<SolicitudMaterial> => {
      setLoading(true);
      setError(null);
      try {
        const response = await SolicitudMaterialService.reabrirSolicitud(id);
        await loadSolicitudes();
        return response;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al reabrir la solicitud";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  return {
    solicitudes,
    filteredSolicitudes,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadSolicitudes,
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
    clearError,
    total,
  };
}
