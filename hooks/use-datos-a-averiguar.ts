import { useState, useEffect, useCallback } from "react";
import { DatosAAveriguarService } from "@/lib/services/feats/datos-a-averiguar/datos-a-averiguar-service";
import type {
  DatoAAveriguar,
  DatoAAveriguarCreateData,
  DatoAAveriguarUpdateData,
} from "@/lib/types/feats/datos-a-averiguar/datos-a-averiguar-types";

interface UseDatosAAveriguarReturn {
  datos: DatoAAveriguar[];
  loading: boolean;
  error: string | null;
  loadDatos: () => Promise<void>;
  crearDato: (data: DatoAAveriguarCreateData) => Promise<boolean>;
  actualizarDato: (
    id: string,
    data: DatoAAveriguarUpdateData,
  ) => Promise<boolean>;
  eliminarDato: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useDatosAAveriguar(): UseDatosAAveriguarReturn {
  const [datos, setDatos] = useState<DatoAAveriguar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DatosAAveriguarService.listar();
      setDatos(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los datos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatos();
  }, [loadDatos]);

  const crearDato = useCallback(
    async (data: DatoAAveriguarCreateData) => {
      try {
        await DatosAAveriguarService.crear(data);
        await loadDatos();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo crear el dato",
        );
        return false;
      }
    },
    [loadDatos],
  );

  const actualizarDato = useCallback(
    async (id: string, data: DatoAAveriguarUpdateData) => {
      try {
        await DatosAAveriguarService.actualizar(id, data);
        await loadDatos();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo actualizar el dato",
        );
        return false;
      }
    },
    [loadDatos],
  );

  const eliminarDato = useCallback(
    async (id: string) => {
      try {
        await DatosAAveriguarService.eliminar(id);
        await loadDatos();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo eliminar el dato",
        );
        return false;
      }
    },
    [loadDatos],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    datos,
    loading,
    error,
    loadDatos,
    crearDato,
    actualizarDato,
    eliminarDato,
    clearError,
  };
}
