import { useState, useEffect, useCallback } from "react";
import { PreguntasFrecuentesService } from "@/lib/services/feats/preguntas-frecuentes/preguntas-frecuentes-service";
import type {
  PreguntaFrecuente,
  PreguntaFrecuenteCreateData,
  PreguntaFrecuenteUpdateData,
} from "@/lib/types/feats/preguntas-frecuentes/preguntas-frecuentes-types";

interface UsePreguntasFrecuentesReturn {
  preguntas: PreguntaFrecuente[];
  loading: boolean;
  error: string | null;
  loadPreguntas: () => Promise<void>;
  crearPregunta: (data: PreguntaFrecuenteCreateData) => Promise<boolean>;
  actualizarPregunta: (
    id: string,
    data: PreguntaFrecuenteUpdateData,
  ) => Promise<boolean>;
  eliminarPregunta: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function usePreguntasFrecuentes(): UsePreguntasFrecuentesReturn {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreguntas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PreguntasFrecuentesService.listar();
      setPreguntas(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las preguntas",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreguntas();
  }, [loadPreguntas]);

  const crearPregunta = useCallback(
    async (data: PreguntaFrecuenteCreateData) => {
      try {
        await PreguntasFrecuentesService.crear(data);
        await loadPreguntas();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo crear la pregunta",
        );
        return false;
      }
    },
    [loadPreguntas],
  );

  const actualizarPregunta = useCallback(
    async (id: string, data: PreguntaFrecuenteUpdateData) => {
      try {
        await PreguntasFrecuentesService.actualizar(id, data);
        await loadPreguntas();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo actualizar la pregunta",
        );
        return false;
      }
    },
    [loadPreguntas],
  );

  const eliminarPregunta = useCallback(
    async (id: string) => {
      try {
        await PreguntasFrecuentesService.eliminar(id);
        await loadPreguntas();
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo eliminar la pregunta",
        );
        return false;
      }
    },
    [loadPreguntas],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    preguntas,
    loading,
    error,
    loadPreguntas,
    crearPregunta,
    actualizarPregunta,
    eliminarPregunta,
    clearError,
  };
}
