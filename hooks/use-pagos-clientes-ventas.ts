"use client";

import { useState, useCallback, useRef } from "react";
import {
  PagoVentaService,
  FacturaClienteVentaService,
} from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type {
  SolicitudVentaListParams,
  SolicitudVentaSummary,
} from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  PagoVentaListParams,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
  FacturaVentaListParams,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const PAGE_SIZE = 100;

type PendientesParams = Omit<SolicitudVentaListParams, "skip" | "limit" | "pagada_totalmente">;
type PagosParams = Omit<PagoVentaListParams, "skip" | "limit">;
type FacturasParams = Omit<FacturaVentaListParams, "skip" | "limit">;

export function usePagosClientesVentas() {
  // ── Pendientes de pago ─────────────────────────────────────────────────────
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudVentaSummary[]>([]);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [hasMorePendientes, setHasMorePendientes] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [errorSolicitudes, setErrorSolicitudes] = useState<string | null>(null);
  const pendientesParamsRef = useRef<PendientesParams>({});

  // ── Todas las solicitudes (legacy — usado por /facturas/pagos-clientes-ventas) ──
  const [todasSolicitudes, setTodasSolicitudes] = useState<SolicitudVentaSummary[]>([]);
  const [loadingTodasSolicitudes, setLoadingTodasSolicitudes] = useState(false);
  const [errorTodasSolicitudes, setErrorTodasSolicitudes] = useState<string | null>(null);

  // ── Pagos realizados ───────────────────────────────────────────────────────
  const [todosPagos, setTodosPagos] = useState<PagoVenta[]>([]);
  const [totalPagos, setTotalPagos] = useState(0);
  const [hasMorePagos, setHasMorePagos] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState<string | null>(null);
  const pagosParamsRef = useRef<PagosParams>({});

  // ── Facturas emitidas ──────────────────────────────────────────────────────
  const [facturas, setFacturas] = useState<FacturaClienteVenta[]>([]);
  const [totalFacturas, setTotalFacturas] = useState(0);
  const [hasMoreFacturas, setHasMoreFacturas] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState<string | null>(null);
  const facturasParamsRef = useRef<FacturasParams>({});

  // ── Pendientes ─────────────────────────────────────────────────────────────
  const fetchSolicitudesPendientes = useCallback(async (params: PendientesParams = {}) => {
    setLoadingSolicitudes(true);
    setErrorSolicitudes(null);
    pendientesParamsRef.current = params;
    try {
      const { data, total } = await SolicitudVentaService.getSolicitudesSummary({
        ...params,
        pagada_totalmente: false,
        skip: 0,
        limit: PAGE_SIZE,
      });
      setSolicitudesPendientes(data || []);
      setTotalPendientes(total || 0);
      setHasMorePendientes((data?.length || 0) < (total || 0));
    } catch (e) {
      setErrorSolicitudes(e instanceof Error ? e.message : "Error al cargar solicitudes");
      setSolicitudesPendientes([]);
      setTotalPendientes(0);
      setHasMorePendientes(false);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  const loadMorePendientes = useCallback(async () => {
    if (loadingSolicitudes || !hasMorePendientes) return;
    setLoadingSolicitudes(true);
    try {
      const { data, total } = await SolicitudVentaService.getSolicitudesSummary({
        ...pendientesParamsRef.current,
        pagada_totalmente: false,
        skip: solicitudesPendientes.length,
        limit: PAGE_SIZE,
      });
      const merged = [...solicitudesPendientes, ...(data || [])];
      setSolicitudesPendientes(merged);
      setTotalPendientes(total || 0);
      setHasMorePendientes(merged.length < (total || 0));
    } catch (e) {
      setErrorSolicitudes(e instanceof Error ? e.message : "Error al cargar más solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [loadingSolicitudes, hasMorePendientes, solicitudesPendientes]);

  // Legacy: lista solicitudes pagadas (sin paginación cliente-side).
  const fetchTodasSolicitudes = useCallback(async () => {
    setLoadingTodasSolicitudes(true);
    setErrorTodasSolicitudes(null);
    try {
      const { data } = await SolicitudVentaService.getSolicitudesSummary({
        pagada_totalmente: true,
        skip: 0,
        limit: PAGE_SIZE,
      });
      setTodasSolicitudes(data || []);
    } catch (e) {
      setErrorTodasSolicitudes(
        e instanceof Error ? e.message : "Error al cargar solicitudes",
      );
      setTodasSolicitudes([]);
    } finally {
      setLoadingTodasSolicitudes(false);
    }
  }, []);

  // ── Pagos ──────────────────────────────────────────────────────────────────
  const fetchTodosPagos = useCallback(async (params: PagosParams = {}) => {
    setLoadingPagos(true);
    setErrorPagos(null);
    pagosParamsRef.current = params;
    try {
      const { data, total } = await PagoVentaService.getTodosPagos({
        ...params,
        skip: 0,
        limit: PAGE_SIZE,
      });
      setTodosPagos(data || []);
      setTotalPagos(total || 0);
      setHasMorePagos((data?.length || 0) < (total || 0));
    } catch (e) {
      setErrorPagos(e instanceof Error ? e.message : "Error al cargar pagos");
      setTodosPagos([]);
      setTotalPagos(0);
      setHasMorePagos(false);
    } finally {
      setLoadingPagos(false);
    }
  }, []);

  const loadMorePagos = useCallback(async () => {
    if (loadingPagos || !hasMorePagos) return;
    setLoadingPagos(true);
    try {
      const { data, total } = await PagoVentaService.getTodosPagos({
        ...pagosParamsRef.current,
        skip: todosPagos.length,
        limit: PAGE_SIZE,
      });
      const merged = [...todosPagos, ...(data || [])];
      setTodosPagos(merged);
      setTotalPagos(total || 0);
      setHasMorePagos(merged.length < (total || 0));
    } catch (e) {
      setErrorPagos(e instanceof Error ? e.message : "Error al cargar más pagos");
    } finally {
      setLoadingPagos(false);
    }
  }, [loadingPagos, hasMorePagos, todosPagos]);

  // ── Facturas ───────────────────────────────────────────────────────────────
  const fetchFacturas = useCallback(async (params: FacturasParams = {}) => {
    setLoadingFacturas(true);
    setErrorFacturas(null);
    facturasParamsRef.current = params;
    try {
      const { data, total } = await FacturaClienteVentaService.getFacturas({
        ...params,
        skip: 0,
        limit: PAGE_SIZE,
      });
      setFacturas(data || []);
      setTotalFacturas(total || 0);
      setHasMoreFacturas((data?.length || 0) < (total || 0));
    } catch (e) {
      setErrorFacturas(e instanceof Error ? e.message : "Error al cargar facturas");
      setFacturas([]);
      setTotalFacturas(0);
      setHasMoreFacturas(false);
    } finally {
      setLoadingFacturas(false);
    }
  }, []);

  const loadMoreFacturas = useCallback(async () => {
    if (loadingFacturas || !hasMoreFacturas) return;
    setLoadingFacturas(true);
    try {
      const { data, total } = await FacturaClienteVentaService.getFacturas({
        ...facturasParamsRef.current,
        skip: facturas.length,
        limit: PAGE_SIZE,
      });
      const merged = [...facturas, ...(data || [])];
      setFacturas(merged);
      setTotalFacturas(total || 0);
      setHasMoreFacturas(merged.length < (total || 0));
    } catch (e) {
      setErrorFacturas(e instanceof Error ? e.message : "Error al cargar más facturas");
    } finally {
      setLoadingFacturas(false);
    }
  }, [loadingFacturas, hasMoreFacturas, facturas]);

  // ── Mutaciones ─────────────────────────────────────────────────────────────
  const registrarPago = useCallback(
    async (data: PagoVentaCreateData): Promise<PagoVenta> => {
      const pago = await PagoVentaService.registrarPago(data);
      await Promise.all([
        fetchSolicitudesPendientes(pendientesParamsRef.current),
        fetchTodosPagos(pagosParamsRef.current),
      ]);
      return pago;
    },
    [fetchSolicitudesPendientes, fetchTodosPagos],
  );

  const crearFactura = useCallback(
    async (data: FacturaClienteVentaCreateData): Promise<FacturaClienteVenta> => {
      const factura = await FacturaClienteVentaService.crearFactura(data);
      await fetchFacturas(facturasParamsRef.current);
      return factura;
    },
    [fetchFacturas],
  );

  const eliminarFactura = useCallback(async (id: string): Promise<void> => {
    await FacturaClienteVentaService.eliminarFactura(id);
    setFacturas((prev) => prev.filter((f) => f.id !== id));
    setTotalFacturas((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    // pendientes
    solicitudesPendientes,
    totalPendientes,
    hasMorePendientes,
    loadingSolicitudes,
    errorSolicitudes,
    fetchSolicitudesPendientes,
    loadMorePendientes,
    // legacy: todas las solicitudes pagadas
    todasSolicitudes,
    loadingTodasSolicitudes,
    errorTodasSolicitudes,
    fetchTodasSolicitudes,
    // pagos
    todosPagos,
    totalPagos,
    hasMorePagos,
    loadingPagos,
    errorPagos,
    fetchTodosPagos,
    loadMorePagos,
    // facturas
    facturas,
    totalFacturas,
    hasMoreFacturas,
    loadingFacturas,
    errorFacturas,
    fetchFacturas,
    loadMoreFacturas,
    // mutaciones
    registrarPago,
    crearFactura,
    eliminarFactura,
  };
}
