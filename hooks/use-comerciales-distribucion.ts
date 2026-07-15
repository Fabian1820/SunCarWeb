import { useState, useEffect, useCallback } from "react";
import { EquipoComercialService } from "@/lib/services/feats/distribucion-comerciales/equipo-comercial-service";
import { TrabajadorService } from "@/lib/services/feats/worker/trabajador-service";
import type { ComercialDistribucion } from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

interface UseComercialesDistribucionReturn {
  comerciales: ComercialDistribucion[];
  loading: boolean;
  error: string | null;
  loadComerciales: () => Promise<void>;
  toggleApoyoInstaladora: (ci: string, valor: boolean) => Promise<boolean>;
}

export function useComercialesDistribucion(): UseComercialesDistribucionReturn {
  const [comerciales, setComerciales] = useState<ComercialDistribucion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComerciales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EquipoComercialService.getComerciales();
      setComerciales(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los comerciales",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleApoyoInstaladora = useCallback(
    async (ci: string, valor: boolean): Promise<boolean> => {
      setError(null);
      try {
        await TrabajadorService.actualizarApoyoInstaladora(ci, valor);
        await loadComerciales();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al actualizar el apoyo a instaladora",
        );
        return false;
      }
    },
    [loadComerciales],
  );

  useEffect(() => {
    loadComerciales();
  }, [loadComerciales]);

  return { comerciales, loading, error, loadComerciales, toggleApoyoInstaladora };
}
