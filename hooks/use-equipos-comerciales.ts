import { useState, useEffect, useCallback } from "react";
import { EquipoComercialService } from "@/lib/services/feats/distribucion-comerciales/equipo-comercial-service";
import type { EquipoComercial } from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

interface UseEquiposComercialesReturn {
  equipos: EquipoComercial[];
  loading: boolean;
  error: string | null;
  loadEquipos: () => Promise<void>;
  createEquipo: (nombre: string, integrantes: string[]) => Promise<boolean>;
  updateEquipo: (
    id: string,
    nombre: string,
    integrantes: string[],
  ) => Promise<boolean>;
  deleteEquipo: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useEquiposComerciales(): UseEquiposComercialesReturn {
  const [equipos, setEquipos] = useState<EquipoComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEquipos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EquipoComercialService.getEquipos();
      setEquipos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los equipos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const createEquipo = useCallback(
    async (nombre: string, integrantes: string[]): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.createEquipo(nombre, integrantes);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al crear el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const updateEquipo = useCallback(
    async (
      id: string,
      nombre: string,
      integrantes: string[],
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.updateEquipo(id, nombre, integrantes);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al actualizar el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const deleteEquipo = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await EquipoComercialService.deleteEquipo(id);
        await loadEquipos();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al eliminar el equipo",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadEquipos],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    loadEquipos();
  }, [loadEquipos]);

  return {
    equipos,
    loading,
    error,
    loadEquipos,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    clearError,
  };
}
