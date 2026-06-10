"use client";

import { useCallback, useState } from "react";
import { ConsignacionService } from "@/lib/services/feats/consignaciones/consignacion-service";
import type {
  Consignacion,
  ConsignacionCreateData,
  ConsignacionListParams,
  RegistrarDevolucionData,
} from "@/lib/types/feats/consignaciones/consignacion-types";

const PAGE_SIZE = 100;

export function useConsignaciones() {
  const [consignaciones, setConsignaciones] = useState<Consignacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsignaciones = useCallback(
    async (params: ConsignacionListParams = {}) => {
      setLoading(true);
      setError(null);
      try {
        const { data, total } = await ConsignacionService.list({
          skip: 0,
          limit: PAGE_SIZE,
          ...params,
        });
        setConsignaciones(data || []);
        setTotal(total || 0);
      } catch (e: any) {
        setError(e?.message || "Error al cargar consignaciones");
        setConsignaciones([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const crearConsignacion = useCallback(
    async (data: ConsignacionCreateData): Promise<Consignacion> => {
      const creada = await ConsignacionService.crear(data);
      setConsignaciones((prev) => [creada, ...prev]);
      setTotal((t) => t + 1);
      return creada;
    },
    [],
  );

  const vincularPago = useCallback(
    async (consignacionId: string, pagoVentaId: string): Promise<Consignacion> => {
      const actualizada = await ConsignacionService.vincularPago(
        consignacionId,
        pagoVentaId,
      );
      setConsignaciones((prev) =>
        prev.map((c) => (c.id === actualizada.id ? actualizada : c)),
      );
      return actualizada;
    },
    [],
  );

  const registrarDevolucion = useCallback(
    async (
      consignacionId: string,
      data: RegistrarDevolucionData,
    ): Promise<Consignacion> => {
      const actualizada = await ConsignacionService.registrarDevolucion(
        consignacionId,
        data,
      );
      setConsignaciones((prev) =>
        prev.map((c) => (c.id === actualizada.id ? actualizada : c)),
      );
      return actualizada;
    },
    [],
  );

  const anular = useCallback(
    async (consignacionId: string, motivo?: string): Promise<Consignacion> => {
      const actualizada = await ConsignacionService.anular(consignacionId, motivo);
      setConsignaciones((prev) =>
        prev.map((c) => (c.id === actualizada.id ? actualizada : c)),
      );
      return actualizada;
    },
    [],
  );

  const refrescar = useCallback(
    async (consignacionId: string): Promise<Consignacion> => {
      const fresca = await ConsignacionService.getById(consignacionId);
      setConsignaciones((prev) =>
        prev.map((c) => (c.id === fresca.id ? fresca : c)),
      );
      return fresca;
    },
    [],
  );

  return {
    consignaciones,
    total,
    loading,
    error,
    fetchConsignaciones,
    crearConsignacion,
    vincularPago,
    registrarDevolucion,
    anular,
    refrescar,
  };
}
