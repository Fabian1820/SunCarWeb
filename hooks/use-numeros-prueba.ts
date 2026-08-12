import { useState, useEffect, useCallback } from "react";
import { NumerosPruebaService } from "@/lib/services/feats/numeros-prueba/numeros-prueba-service";
import type {
  NumeroPrueba,
  NumeroPruebaCreateData,
  NumeroPruebaUpdateData,
} from "@/lib/types/feats/numeros-prueba/numeros-prueba-types";

interface UseNumerosPruebaReturn {
  numeros: NumeroPrueba[];
  loading: boolean;
  error: string | null;
  loadNumeros: () => Promise<void>;
  crearNumero: (data: NumeroPruebaCreateData) => Promise<boolean>;
  actualizarNumero: (
    id: string,
    data: NumeroPruebaUpdateData,
  ) => Promise<boolean>;
  eliminarNumero: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useNumerosPrueba(): UseNumerosPruebaReturn {
  const [numeros, setNumeros] = useState<NumeroPrueba[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNumeros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await NumerosPruebaService.listar();
      setNumeros(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los numeros",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNumeros();
  }, [loadNumeros]);

  const crearNumero = useCallback(
    async (data: NumeroPruebaCreateData) => {
      try {
        await NumerosPruebaService.crear(data);
        await loadNumeros();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo crear el numero",
        );
        return false;
      }
    },
    [loadNumeros],
  );

  const actualizarNumero = useCallback(
    async (id: string, data: NumeroPruebaUpdateData) => {
      try {
        await NumerosPruebaService.actualizar(id, data);
        await loadNumeros();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo actualizar el numero",
        );
        return false;
      }
    },
    [loadNumeros],
  );

  const eliminarNumero = useCallback(
    async (id: string) => {
      try {
        await NumerosPruebaService.eliminar(id);
        await loadNumeros();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo eliminar el numero",
        );
        return false;
      }
    },
    [loadNumeros],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    numeros,
    loading,
    error,
    loadNumeros,
    crearNumero,
    actualizarNumero,
    eliminarNumero,
    clearError,
  };
}
