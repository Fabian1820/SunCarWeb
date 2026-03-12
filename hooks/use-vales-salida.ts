import { useState, useEffect, useCallback, useMemo } from "react";
import { ValeSalidaService } from "@/lib/api-services";
import type { ValeSalida, ValeSalidaCreateData } from "@/lib/api-types";

interface UseValesSalidaReturn {
  vales: ValeSalida[];
  filteredVales: ValeSalida[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loadVales: () => Promise<void>;
  createVale: (data: ValeSalidaCreateData) => Promise<ValeSalida>;
  deleteVale: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useValesSalida(): UseValesSalidaReturn {
  const [vales, setVales] = useState<ValeSalida[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadVales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ValeSalidaService.getVales();
      setVales(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los vales de salida",
      );
      setVales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredVales = useMemo(() => {
    if (!searchTerm.trim()) return vales;

    const term = searchTerm.toLowerCase();
    return vales.filter((v) => {
      const solicitud = v.solicitud_material || v.solicitud;
      return (
        v.codigo?.toLowerCase().includes(term) ||
        solicitud?.codigo?.toLowerCase().includes(term) ||
        solicitud?.cliente?.nombre?.toLowerCase().includes(term) ||
        v.trabajador?.nombre?.toLowerCase().includes(term) ||
        v.trabajador?.ci?.toLowerCase().includes(term)
      );
    });
  }, [vales, searchTerm]);

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

  const deleteVale = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await ValeSalidaService.deleteVale(id);
        await loadVales();
        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al eliminar el vale";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [loadVales],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadVales();
  }, [loadVales]);

  return {
    vales,
    filteredVales,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadVales,
    createVale,
    deleteVale,
    clearError,
  };
}
