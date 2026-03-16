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
  estadoFilter: "todos" | "usado" | "anulado";
  setEstadoFilter: (estado: "todos" | "usado" | "anulado") => void;
  loadVales: () => Promise<void>;
  createVale: (data: ValeSalidaCreateData) => Promise<ValeSalida>;
  anularVale: (id: string, motivoAnulacion: string) => Promise<boolean>;
  clearError: () => void;
}

export function useValesSalida(): UseValesSalidaReturn {
  const [vales, setVales] = useState<ValeSalida[]>([]);
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
      const data = await ValeSalidaService.getVales(
        estadoFilter === "todos" ? {} : { estado: estadoFilter },
      );
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
  }, [estadoFilter]);

  const filteredVales = useMemo(() => {
    if (!searchTerm.trim()) return vales;

    const term = searchTerm.toLowerCase();
    return vales.filter((v) => {
      const solicitud =
        v.solicitud_material || v.solicitud_venta || v.solicitud;
      const clienteNombre =
        solicitud?.cliente?.nombre || solicitud?.cliente_venta?.nombre;
      const solicitudCodigo =
        solicitud?.codigo ||
        v.solicitud_material_id?.slice(-6).toUpperCase() ||
        v.solicitud_venta_id?.slice(-6).toUpperCase();
      const responsableRecogida =
        v.recogido_por || solicitud?.responsable_recogida;
      return (
        v.codigo?.toLowerCase().includes(term) ||
        v.estado?.toLowerCase().includes(term) ||
        solicitudCodigo?.toLowerCase().includes(term) ||
        clienteNombre?.toLowerCase().includes(term) ||
        v.trabajador?.nombre?.toLowerCase().includes(term) ||
        v.trabajador?.ci?.toLowerCase().includes(term) ||
        responsableRecogida?.toLowerCase().includes(term) ||
        solicitud?.fecha_recogida?.toLowerCase().includes(term)
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
  };
}
