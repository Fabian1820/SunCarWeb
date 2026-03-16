import { useState, useEffect, useCallback, useMemo } from "react";
import { SolicitudMaterialService } from "@/lib/api-services";
import type {
  SolicitudMaterial,
  SolicitudMaterialCreateData,
  SolicitudMaterialUpdateData,
} from "@/lib/api-types";

interface UseSolicitudesMaterialesReturn {
  solicitudes: SolicitudMaterial[];
  filteredSolicitudes: SolicitudMaterial[];
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
  reabrirSolicitud: (id: string) => Promise<boolean>;
  deleteSolicitud: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useSolicitudesMateriales(): UseSolicitudesMaterialesReturn {
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SolicitudMaterialService.getSolicitudes();
      setSolicitudes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las solicitudes",
      );
      setSolicitudes([]);
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
        s.cliente?.nombre?.toLowerCase().includes(term) ||
        s.cliente?.numero?.toLowerCase().includes(term) ||
        s.almacen?.nombre?.toLowerCase().includes(term) ||
        s.trabajador?.nombre?.toLowerCase().includes(term) ||
        s.trabajador?.ci?.toLowerCase().includes(term) ||
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

  const deleteSolicitud = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await SolicitudMaterialService.deleteSolicitud(id);
        await loadSolicitudes();
        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al eliminar la solicitud";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadSolicitudes],
  );

  const reabrirSolicitud = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await SolicitudMaterialService.reabrirSolicitud(id);
        await loadSolicitudes();
        return true;
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
    reabrirSolicitud,
    deleteSolicitud,
    clearError,
  };
}
