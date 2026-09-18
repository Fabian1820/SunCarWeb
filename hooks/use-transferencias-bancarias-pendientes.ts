import { useCallback, useEffect, useState } from "react";
import { TransferenciaBancariaService } from "@/lib/api-services";
import {
  convertTransferenciaBancariaToFrontend,
  type AceptarTransferenciaBancariaData,
  type TransferenciaBancaria,
} from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types";

/**
 * Hook para la alerta de transferencias pendientes en Wallet
 * (`transferencia-bancaria-pendiente-alert.tsx`, en `app/wallet/page.tsx`).
 * Requiere que quien la use ya tenga permiso de admin de wallet
 * (`useMyWalletPermiso()`), igual que el resto de Wallet — este hook no
 * repite esa validación, solo llama a los endpoints correspondientes.
 */
export function useTransferenciasBancariasPendientes(
  bancoId: string | null | undefined,
  enabled: boolean = true,
) {
  const [pendientes, setPendientes] = useState<TransferenciaBancaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !bancoId) {
      setPendientes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const backendList =
        await TransferenciaBancariaService.listarPendientesPorBanco(bancoId);
      setPendientes(backendList.map(convertTransferenciaBancariaToFrontend));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las transferencias bancarias pendientes",
      );
    } finally {
      setLoading(false);
    }
  }, [bancoId, enabled]);

  const aceptar = useCallback(
    async (
      id: string,
      comprobanteAdmin?: AceptarTransferenciaBancariaData,
    ): Promise<TransferenciaBancaria> => {
      setProcesando(true);
      setError(null);
      try {
        const backend = await TransferenciaBancariaService.aceptar(
          id,
          comprobanteAdmin,
        );
        await reload();
        return convertTransferenciaBancariaToFrontend(backend);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo aceptar la transferencia bancaria";
        setError(message);
        throw new Error(message);
      } finally {
        setProcesando(false);
      }
    },
    [reload],
  );

  const rechazar = useCallback(
    async (id: string, motivo: string): Promise<TransferenciaBancaria> => {
      setProcesando(true);
      setError(null);
      try {
        const backend = await TransferenciaBancariaService.rechazar(id, motivo);
        await reload();
        return convertTransferenciaBancariaToFrontend(backend);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo rechazar la transferencia bancaria";
        setError(message);
        throw new Error(message);
      } finally {
        setProcesando(false);
      }
    },
    [reload],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    pendientes,
    loading,
    procesando,
    error,
    reload,
    aceptar,
    rechazar,
    clearError: () => setError(null),
  };
}
