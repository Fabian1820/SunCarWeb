import { useState, useEffect, useCallback, useRef } from "react";
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
  isSearching: boolean; // Nueva bandera para indicar búsqueda en progreso
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
  const [isSearching, setIsSearching] = useState(false); // Búsqueda en progreso
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Ref para evitar recrear loadSolicitudes en cada render
  const isFirstRender = useRef(true);

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { q?: string } = {};

      // Si hay un término de búsqueda, agregarlo como 'q' (búsqueda de texto libre)
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }

      const response = await SolicitudMaterialService.getSolicitudesSummary(params);
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
  }, [searchTerm]);

  // Ahora filteredSolicitudes es igual a solicitudes ya que el filtrado lo hace el backend
  const filteredSolicitudes = solicitudes;

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

  // Debounce para la búsqueda: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    // Saltar el primer render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void loadSolicitudes(); // Cargar inmediatamente en el primer render
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
    loadSolicitudes,
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
    clearError,
    total,
  };
}
