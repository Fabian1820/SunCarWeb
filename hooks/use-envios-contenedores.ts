import { useCallback, useEffect, useMemo, useState } from "react";
import { EnvioContenedorService } from "@/lib/api-services";
import type {
  EnvioContenedor,
  EnvioContenedorCreateData,
  EstadoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

interface UseEnviosContenedoresReturn {
  envios: EnvioContenedor[];
  filteredEnvios: EnvioContenedor[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  estadoFilter: "todos" | EstadoEnvioContenedor;
  setEstadoFilter: (value: "todos" | EstadoEnvioContenedor) => void;
  loadEnvios: () => Promise<void>;
  createEnvio: (data: EnvioContenedorCreateData) => Promise<EnvioContenedor>;
  clearError: () => void;
}

export function useEnviosContenedores(): UseEnviosContenedoresReturn {
  const [envios, setEnvios] = useState<EnvioContenedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | EstadoEnvioContenedor
  >("todos");

  const loadEnvios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await EnvioContenedorService.getEnvios();
      setEnvios(
        [...data].sort((a, b) => {
          const dateA = new Date(a.fecha_envio || 0).getTime();
          const dateB = new Date(b.fecha_envio || 0).getTime();
          return dateB - dateA;
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los envíos de contenedores",
      );
      setEnvios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEnvios();
  }, [loadEnvios]);

  const createEnvio = useCallback(
    async (data: EnvioContenedorCreateData) => {
      setCreating(true);
      setError(null);

      try {
        const created = await EnvioContenedorService.createEnvio(data);
        setEnvios((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo registrar el envío de contenedor";
        setError(message);
        throw new Error(message);
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const filteredEnvios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return envios.filter((envio) => {
      if (estadoFilter !== "todos" && envio.estado !== estadoFilter) {
        return false;
      }

      if (!term) return true;

      const index = [
        envio.nombre,
        envio.descripcion,
        envio.fecha_envio,
        envio.fecha_llegada_aproximada,
        ...envio.materiales.map((item) => item.material_nombre),
        ...envio.materiales.map((item) => item.material_codigo),
      ]
        .join(" ")
        .toLowerCase();

      return index.includes(term);
    });
  }, [envios, searchTerm, estadoFilter]);

  const clearError = useCallback(() => setError(null), []);

  return {
    envios,
    filteredEnvios,
    loading,
    creating,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    loadEnvios,
    createEnvio,
    clearError,
  };
}
