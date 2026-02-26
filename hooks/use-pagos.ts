import { useState, useCallback } from "react";
import {
  PagosService,
  type OfertaConfirmadaSinPago,
} from "@/lib/services/feats/pagos/pagos-service";
import {
  PagoService,
  type OfertaConPagos,
} from "@/lib/services/feats/pagos/pago-service";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function usePagos() {
  const [ofertasSinPago, setOfertasSinPago] = useState<
    OfertaConfirmadaSinPago[]
  >([]);
  const [ofertasConSaldoPendiente, setOfertasConSaldoPendiente] = useState<
    OfertaConfirmadaSinPago[]
  >([]);
  const [ofertasConPagos, setOfertasConPagos] = useState<OfertaConPagos[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSinPago, setLoadingSinPago] = useState(false);
  const [loadingConSaldo, setLoadingConSaldo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOfertasSinPago = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setLoadingSinPago(true);
      }

      try {
        const data = await PagosService.getOfertasConfirmadasSinPago();
        setOfertasSinPago(data);
      } catch (err: unknown) {
        console.error("[usePagos] Error:", err);
        setError(getErrorMessage(err, "Error al cargar ofertas sin pago"));
      } finally {
        if (!silent) {
          setLoadingSinPago(false);
        }
      }
    },
    [],
  );

  const fetchOfertasConSaldoPendiente = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setLoadingConSaldo(true);
      }

      try {
        const data = await PagosService.getOfertasConfirmadasConSaldoPendiente();
        setOfertasConSaldoPendiente(data);
      } catch (err: unknown) {
        console.error("[usePagos] Error:", err);
        setError(
          getErrorMessage(err, "Error al cargar ofertas con saldo pendiente"),
        );
      } finally {
        if (!silent) {
          setLoadingConSaldo(false);
        }
      }
    },
    [],
  );

  const fetchOfertasConPagos = useCallback(async () => {
    try {
      const data = await PagoService.getOfertasConPagos();
      setOfertasConPagos(data);
    } catch (err: unknown) {
      console.error("[usePagos] Error:", err);
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    fetchOfertasSinPago();
    fetchOfertasConSaldoPendiente();
    setLoading(false);
  }, [fetchOfertasConSaldoPendiente, fetchOfertasSinPago]);

  const refetchOfertasConPagos = useCallback(async () => {
    try {
      await fetchOfertasConPagos();
    } catch (err: unknown) {
      console.error("[usePagos] Error al cargar ofertas con pagos:", err);
    }
  }, [fetchOfertasConPagos]);

  return {
    ofertasSinPago,
    ofertasConSaldoPendiente,
    ofertasConPagos,
    loading,
    loadingSinPago,
    loadingConSaldo,
    error,
    refetch,
    refetchOfertasSinPago: fetchOfertasSinPago,
    refetchOfertasConSaldoPendiente: fetchOfertasConSaldoPendiente,
    refetchOfertasConPagos,
  };
}
