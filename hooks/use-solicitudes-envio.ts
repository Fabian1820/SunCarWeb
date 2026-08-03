"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SolicitudEnvioService } from "@/lib/api-services";
import type {
  CompletarSolicitudData,
  EstadoSolicitudEnvio,
  ListSolicitudesEnvioParams,
  SolicitudEnvio,
  SolicitudEnvioCreateData,
  SolicitudEnvioUpdateData,
  UrgenciaSolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

export type EstadoFiltro = "todos" | EstadoSolicitudEnvio;

interface Filtros {
  estado: EstadoFiltro;
  urgencia: UrgenciaSolicitudEnvio | "todas";
  q: string;
  almacenId?: string;
  creadaPorCi?: string;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Comparator para la vista de la compradora internacional: pendientes/en_proceso
 * primero, urgencia alta antes que normal, más antiguas primero (cola FIFO).
 * Completadas y canceladas se van al fondo por fecha desc.
 */
function comparatorInternacional(a: SolicitudEnvio, b: SolicitudEnvio): number {
  const scoreEstado = (s: SolicitudEnvio) => {
    if (s.estado === "pendiente") return 0;
    if (s.estado === "en_proceso") return 1;
    if (s.estado === "completada") return 2;
    return 3;
  };
  const scoreUrg = (s: SolicitudEnvio) => (s.urgencia === "alta" ? 0 : 1);
  const de = scoreEstado(a) - scoreEstado(b);
  if (de !== 0) return de;
  const activo = a.estado === "pendiente" || a.estado === "en_proceso";
  if (activo) {
    const du = scoreUrg(a) - scoreUrg(b);
    if (du !== 0) return du;
    return (
      new Date(a.creada_en ?? 0).getTime() - new Date(b.creada_en ?? 0).getTime()
    );
  }
  return (
    new Date(b.creada_en ?? 0).getTime() - new Date(a.creada_en ?? 0).getTime()
  );
}

export function useSolicitudesEnvio(
  opts: { modo?: "local" | "internacional" } = {},
) {
  const modo = opts.modo ?? "local";
  const [items, setItems] = useState<SolicitudEnvio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<Filtros>({
    estado: "todos",
    urgencia: "todas",
    q: "",
  });

  const fetchIdRef = useRef(0);

  const fetchList = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: ListSolicitudesEnvioParams = {
        page,
        page_size: pageSize,
      };
      if (filtros.estado !== "todos") params.estado = filtros.estado;
      if (filtros.urgencia !== "todas") params.urgencia = filtros.urgencia;
      if (filtros.q.trim()) params.q = filtros.q.trim();
      if (filtros.almacenId) params.almacen_id = filtros.almacenId;
      if (filtros.creadaPorCi) params.creada_por_ci = filtros.creadaPorCi;

      const res = await SolicitudEnvioService.list(params);
      if (id !== fetchIdRef.current) return; // stale
      const ordenados =
        modo === "internacional"
          ? [...res.data].sort(comparatorInternacional)
          : res.data;
      setItems(ordenados);
      setTotal(res.total);
    } catch (e) {
      if (id === fetchIdRef.current)
        setError(e instanceof Error ? e.message : "Error cargando solicitudes");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [page, pageSize, filtros, modo]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    [total, pageSize],
  );

  const create = useCallback(
    async (data: SolicitudEnvioCreateData) => {
      const s = await SolicitudEnvioService.create(data);
      await fetchList();
      return s;
    },
    [fetchList],
  );

  const update = useCallback(
    async (id: string, data: SolicitudEnvioUpdateData) => {
      const s = await SolicitudEnvioService.update(id, data);
      await fetchList();
      return s;
    },
    [fetchList],
  );

  const marcarEnProceso = useCallback(
    async (id: string, notas?: string) => {
      const s = await SolicitudEnvioService.marcarEnProceso(id, {
        notas_internacional: notas,
      });
      await fetchList();
      return s;
    },
    [fetchList],
  );

  const completar = useCallback(
    async (id: string, payload: CompletarSolicitudData) => {
      const r = await SolicitudEnvioService.completar(id, payload);
      await fetchList();
      return r;
    },
    [fetchList],
  );

  const cancelar = useCallback(
    async (id: string, motivo: string) => {
      const s = await SolicitudEnvioService.cancelar(id, motivo);
      await fetchList();
      return s;
    },
    [fetchList],
  );

  const updateFiltros = useCallback((patch: Partial<Filtros>) => {
    setFiltros((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    filtros,
    setPage,
    setPageSize,
    updateFiltros,
    reload: fetchList,
    create,
    update,
    marcarEnProceso,
    completar,
    cancelar,
  };
}
