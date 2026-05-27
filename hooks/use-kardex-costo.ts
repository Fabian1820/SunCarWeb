import { useCallback, useEffect, useState } from "react";
import { KardexCostoService } from "@/lib/api-services";
import type {
  CostoActualResponse,
  KardexCosto,
} from "@/lib/types/feats/kardex-costo/kardex-costo-types";

interface UseKardexCostoArgs {
  materialId: string;
  almacenId: string;
  autoLoad?: boolean;
}

interface UseKardexCostoReturn {
  historial: KardexCosto[];
  costoActual: CostoActualResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useKardexCosto({
  materialId,
  almacenId,
  autoLoad = true,
}: UseKardexCostoArgs): UseKardexCostoReturn {
  const [historial, setHistorial] = useState<KardexCosto[]>([]);
  const [costoActual, setCostoActual] = useState<CostoActualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!materialId.trim() || !almacenId.trim()) {
      setHistorial([]);
      setCostoActual(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [hist, costo] = await Promise.all([
        KardexCostoService.getHistorial({ material_id: materialId, almacen_id: almacenId, limit: 200 }),
        KardexCostoService.getCostoActual(materialId, almacenId),
      ]);
      setHistorial(
        [...hist].sort((a, b) => {
          const dateA = new Date(a.fecha || 0).getTime();
          const dateB = new Date(b.fecha || 0).getTime();
          return dateB - dateA;
        }),
      );
      setCostoActual(costo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar el kardex");
      setHistorial([]);
      setCostoActual(null);
    } finally {
      setLoading(false);
    }
  }, [materialId, almacenId]);

  useEffect(() => {
    if (autoLoad) void refresh();
  }, [autoLoad, refresh]);

  return { historial, costoActual, loading, error, refresh };
}
