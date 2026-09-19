"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SolicitudEnvioService } from "@/lib/api-services";
import type {
  CompletarSolicitudData,
  EstadoSolicitudEnvio,
  ListSolicitudesEnvioParams,
  SolicitudEnvioCreateData,
  SolicitudEnvioUpdateData,
  SolicitudEnvio,
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
const DEBOUNCE_MS = 350;

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
  /** Solo la búsqueda libre se retrasa; los selects aplican al instante. */
  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(filtros.q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filtros.q]);

  const fetchIdRef = useRef(0);

  const fetchList = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: ListSolicitudesEnvioParams = {
        page,
        page_size: pageSize,
        // La cola se ordena en Mongo: ordenar en el cliente solo reordenaría
        // la página actual y con >1 página la prioridad saldría mal.
        orden: modo === "internacional" ? "cola" : undefined,
      };
      if (filtros.estado !== "todos") params.estado = filtros.estado;
      if (filtros.urgencia !== "todas") params.urgencia = filtros.urgencia;
      if (qDebounced.trim()) params.q = qDebounced.trim();
      if (filtros.almacenId) params.almacen_id = filtros.almacenId;
      if (filtros.creadaPorCi) params.creada_por_ci = filtros.creadaPorCi;

      const res = await SolicitudEnvioService.list(params);
      if (id !== fetchIdRef.current) return; // stale
      setItems(res.data);
      setTotal(res.total);
    } catch (e) {
      if (id === fetchIdRef.current)
        setError(e instanceof Error ? e.message : "Error cargando solicitudes");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [
    page,
    pageSize,
    modo,
    qDebounced,
    filtros.estado,
    filtros.urgencia,
    filtros.almacenId,
    filtros.creadaPorCi,
  ]);

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
