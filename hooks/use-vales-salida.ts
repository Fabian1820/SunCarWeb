import { useState, useEffect, useCallback, useMemo } from "react";
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
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  estadoFilter: "todos" | "usado" | "anulado";
  setEstadoFilter: (estado: "todos" | "usado" | "anulado") => void;
  loadVales: () => Promise<void>;
  createVale: (data: ValeSalidaCreateData) => Promise<ValeSalida>;
  anularVale: (id: string, motivoAnulacion: string) => Promise<boolean>;
  clearError: () => void;
  total: number;
}

export function useValesSalida(): UseValesSalidaReturn {
  const [vales, setVales] = useState<ValeSalidaSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | "usado" | "anulado"
  >("todos");

  const loadVales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ValeSalidaService.getValesSummary(
        estadoFilter === "todos" ? {} : { estado: estadoFilter },
      );
      setVales(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los vales de salida",
      );
      setVales([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  const filteredVales = useMemo(() => {
    if (!searchTerm.trim()) return vales;

    const term = searchTerm.toLowerCase();
    return vales.filter((v) => {
      return (
        v.codigo?.toLowerCase().includes(term) ||
        v.estado?.toLowerCase().includes(term) ||
        v.solicitud_codigo?.toLowerCase().includes(term) ||
        v.cliente_nombre?.toLowerCase().includes(term) ||
        v.creador_nombre?.toLowerCase().includes(term) ||
        v.recibido_por?.toLowerCase().includes(term)
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
    estadoFilter,
    setEstadoFilter,
    loadVales,
    createVale,
    anularVale,
    clearError,
    total,
  };
}
