import { useState, useCallback } from "react";
import {
  PagosService,
  type OfertaConfirmadaSinPago,
} from "@/lib/services/feats/pagos/pagos-service";
import {
  PagoService,
  type OfertaConPagos,
  type CobrosPaginadoParams,
} from "@/lib/services/feats/pagos/pago-service";

export const PAGOS_LIMIT = 40;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function usePagos() {
  // ── Anticipos pendientes (sin_pago) ──────────────────────────
  const [ofertasSinPago, setOfertasSinPago] = useState<OfertaConfirmadaSinPago[]>([]);
  const [totalSinPago, setTotalSinPago] = useState(0);
  const [skipSinPago, setSkipSinPago] = useState(0);
  const [loadingSinPago, setLoadingSinPago] = useState(false);

  // ── Finales pendientes (con_saldo) ───────────────────────────
  const [ofertasConSaldoPendiente, setOfertasConSaldoPendiente] = useState<OfertaConfirmadaSinPago[]>([]);
  const [totalConSaldo, setTotalConSaldo] = useState(0);
  const [skipConSaldo, setSkipConSaldo] = useState(0);
  const [loadingConSaldo, setLoadingConSaldo] = useState(false);

  // ── Cobros por ofertas paginado ──────────────────────────────
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaConPagos[]>([]);
  const [totalCobros, setTotalCobros] = useState(0);
  const [skipCobros, setSkipCobros] = useState(0);
  const [loadingCobros, setLoadingCobros] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch anticipos paginado ─────────────────────────────────
  const fetchOfertasSinPago = useCallback(
    async (options?: { skip?: number; q?: string; silent?: boolean }) => {
      const { skip = 0, q, silent = false } = options ?? {};
      if (!silent) setLoadingSinPago(true);
      try {
        const result = await PagosService.getOfertasPendientesPaginado({
          tipo: "sin_pago",
          skip,
          limit: PAGOS_LIMIT,
          q,
        });
        setOfertasSinPago(result.data ?? []);
        setTotalSinPago(result.total ?? 0);
        setSkipSinPago(result.skip ?? skip);
      } catch (err: unknown) {
        console.error("[usePagos] fetchOfertasSinPago:", err);
        setError(getErrorMessage(err, "Error al cargar anticipos pendientes"));
      } finally {
        if (!silent) setLoadingSinPago(false);
      }
    },
    [],
  );

  // ── Fetch finales pendientes paginado ────────────────────────
  const fetchOfertasConSaldoPendiente = useCallback(
    async (options?: { skip?: number; q?: string; silent?: boolean }) => {
      const { skip = 0, q, silent = false } = options ?? {};
      if (!silent) setLoadingConSaldo(true);
      try {
        const result = await PagosService.getOfertasPendientesPaginado({
          tipo: "con_saldo",
          skip,
          limit: PAGOS_LIMIT,
          q,
        });
        setOfertasConSaldoPendiente(result.data ?? []);
        setTotalConSaldo(result.total ?? 0);
        setSkipConSaldo(result.skip ?? skip);
      } catch (err: unknown) {
        console.error("[usePagos] fetchOfertasConSaldoPendiente:", err);
        setError(getErrorMessage(err, "Error al cargar finales pendientes"));
      } finally {
        if (!silent) setLoadingConSaldo(false);
      }
    },
    [],
  );

  // ── Fetch cobros paginado ────────────────────────────────────
  const fetchOfertasConPagos = useCallback(
    async (options?: {
      skip?: number;
      q?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      devoluciones?: CobrosPaginadoParams["devoluciones"];
      estado_pendiente?: CobrosPaginadoParams["estado_pendiente"];
      estado_cliente?: string;
      silent?: boolean;
    }) => {
      const { silent = false, skip = 0, ...filters } = options ?? {};
      if (!silent) setLoadingCobros(true);
      try {
        const result = await PagoService.getCobrosPaginado({
          skip,
          limit: PAGOS_LIMIT,
          ...filters,
        });
        setOfertasConPagos(result.data ?? []);
        setTotalCobros(result.total ?? 0);
        setSkipCobros(result.skip ?? skip);
      } catch (err: unknown) {
        console.error("[usePagos] fetchOfertasConPagos:", err);
        setError(getErrorMessage(err, "Error al cargar cobros por ofertas"));
      } finally {
        if (!silent) setLoadingCobros(false);
      }
    },
    [],
  );

  // ── Refetch completo (ambas listas, sin filtros, desde skip=0) ─
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    fetchOfertasSinPago({ skip: 0 });
    fetchOfertasConSaldoPendiente({ skip: 0 });
    setLoading(false);
  }, [fetchOfertasConSaldoPendiente, fetchOfertasSinPago]);

  const refetchOfertasConPagos = useCallback(
    async (
      options?: Parameters<typeof fetchOfertasConPagos>[0],
    ) => {
      try {
        await fetchOfertasConPagos(options);
      } catch (err: unknown) {
        console.error("[usePagos] Error al cargar ofertas con pagos:", err);
      }
    },
    [fetchOfertasConPagos],
  );

  return {
    // Datos
    ofertasSinPago,
    ofertasConSaldoPendiente,
    ofertasConPagos,
    // Totales y offsets
    totalSinPago,
    skipSinPago,
    totalConSaldo,
    skipConSaldo,
    totalCobros,
    skipCobros,
    // Loading states
    loading,
    loadingSinPago,
    loadingConSaldo,
    loadingCobros,
    error,
    // Acciones
    refetch,
    refetchOfertasSinPago: fetchOfertasSinPago,
    refetchOfertasConSaldoPendiente: fetchOfertasConSaldoPendiente,
    refetchOfertasConPagos,
  };
}
