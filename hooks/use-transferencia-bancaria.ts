import { useCallback, useState } from "react";
import { TransferenciaBancariaService } from "@/lib/api-services";
import {
  convertTransferenciaBancariaToFrontend,
  type TransferenciaBancaria,
  type TransferenciaBancariaCreateData,
  type TransferenciaBancariaUpdateData,
  type UploadComprobanteTransferenciaResponse,
} from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types";

/**
 * Hook para el diálogo de la comercial (`transferencia-bancaria-dialog.tsx`,
 * enganchado desde el "..." de Leads/Clientes): busca si la oferta elegida ya
 * tiene una transferencia, crea, edita, cancela y sube el comprobante del
 * cliente. Estado local de una sola transferencia a la vez (la del diálogo
 * abierto), no un listado.
 */
export function useTransferenciaBancaria() {
  const [transferencia, setTransferencia] = useState<TransferenciaBancaria | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarPorOferta = useCallback(
    async (ofertaId: string): Promise<TransferenciaBancaria | null> => {
      setLoading(true);
      setError(null);
      try {
        const backend =
          await TransferenciaBancariaService.getPendienteDeOferta(ofertaId);
        const convertida = backend
          ? convertTransferenciaBancariaToFrontend(backend)
          : null;
        setTransferencia(convertida);
        return convertida;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo verificar la transferencia bancaria de la oferta";
        setError(message);
        setTransferencia(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const crear = useCallback(
    async (
      data: TransferenciaBancariaCreateData,
    ): Promise<TransferenciaBancaria> => {
      setGuardando(true);
      setError(null);
      try {
        const backend = await TransferenciaBancariaService.crear(data);
        const convertida = convertTransferenciaBancariaToFrontend(backend);
        setTransferencia(convertida);
        return convertida;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo crear la transferencia bancaria";
        setError(message);
        throw new Error(message);
      } finally {
        setGuardando(false);
      }
    },
    [],
  );

  const actualizar = useCallback(
    async (
      id: string,
      data: TransferenciaBancariaUpdateData,
    ): Promise<TransferenciaBancaria> => {
      setGuardando(true);
      setError(null);
      try {
        const backend = await TransferenciaBancariaService.actualizar(id, data);
        const convertida = convertTransferenciaBancariaToFrontend(backend);
        setTransferencia(convertida);
        return convertida;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo actualizar la transferencia bancaria";
        setError(message);
        throw new Error(message);
      } finally {
        setGuardando(false);
      }
    },
    [],
  );

  const cancelar = useCallback(
    async (id: string): Promise<TransferenciaBancaria> => {
      setGuardando(true);
      setError(null);
      try {
        const backend = await TransferenciaBancariaService.cancelar(id);
        const convertida = convertTransferenciaBancariaToFrontend(backend);
        setTransferencia(convertida);
        return convertida;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cancelar la transferencia bancaria";
        setError(message);
        throw new Error(message);
      } finally {
        setGuardando(false);
      }
    },
    [],
  );

  const subirComprobante = useCallback(
    async (file: File): Promise<UploadComprobanteTransferenciaResponse> => {
      setSubiendoComprobante(true);
      setError(null);
      try {
        return await TransferenciaBancariaService.subirComprobante(file);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo subir el comprobante";
        setError(message);
        throw new Error(message);
      } finally {
        setSubiendoComprobante(false);
      }
    },
    [],
  );

  const limpiar = useCallback(() => {
    setTransferencia(null);
    setError(null);
  }, []);

  return {
    transferencia,
    loading,
    guardando,
    subiendoComprobante,
    error,
    buscarPorOferta,
    crear,
    actualizar,
    cancelar,
    subirComprobante,
    clearError: () => setError(null),
    limpiar,
  };
}
