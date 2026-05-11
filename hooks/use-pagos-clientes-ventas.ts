"use client";

import { useState, useCallback } from "react";
import {
  PagoVentaService,
  FacturaClienteVentaService,
} from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVentaSummary } from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

const toSummaryFromSolicitud = (s: any): SolicitudVentaSummary => ({
  id: s.id,
  codigo: s.codigo,
  estado: s.estado,
  cliente_venta_id: s.cliente_venta_id ?? s.cliente_venta?.id ?? null,
  cliente_venta_nombre: s.cliente_venta?.nombre ?? null,
  almacen_nombre: s.almacen?.nombre,
  creador_nombre: s.trabajador?.nombre,
  materiales: Array.isArray(s.materiales)
    ? s.materiales.map((m: any) => ({
        material_id: m.material_id,
        material_codigo: m.material_codigo ?? m.codigo ?? null,
        material_descripcion: m.material_descripcion ?? m.descripcion ?? null,
        um: m.um ?? null,
        cantidad: Number(m.cantidad) || 0,
        precio: m.precio,
        subtotal: m.subtotal,
      }))
    : [],
  precio_total: s.precio_total ?? null,
  total_pagado: s.total_pagado ?? null,
  monto_pendiente: s.saldo_pendiente ?? s.monto_pendiente ?? null,
  pagada_totalmente: s.pagada_totalmente,
  descuento_porcentaje: s.descuento_porcentaje ?? null,
  fecha_creacion: s.fecha_creacion,
});

export function usePagosClientesVentas() {
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<SolicitudVentaSummary[]>([]);
  const [todasSolicitudes, setTodasSolicitudes] = useState<SolicitudVentaSummary[]>([]);
  const [todosPagos, setTodosPagos] = useState<PagoVenta[]>([]);
  const [facturas, setFacturas] = useState<FacturaClienteVenta[]>([]);

  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingTodasSolicitudes, setLoadingTodasSolicitudes] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  const [errorSolicitudes, setErrorSolicitudes] = useState<string | null>(null);
  const [errorTodasSolicitudes, setErrorTodasSolicitudes] = useState<string | null>(null);
  const [errorPagos, setErrorPagos] = useState<string | null>(null);
  const [errorFacturas, setErrorFacturas] = useState<string | null>(null);

  const fetchSolicitudesPendientes = useCallback(async () => {
    setLoadingSolicitudes(true);
    setErrorSolicitudes(null);
    try {
      const { data } = await SolicitudVentaService.getSolicitudesSummary({
        pagada_totalmente: false,
      });

      if (Array.isArray(data) && data.length > 0) {
        setSolicitudesPendientes(data);
        return;
      }

      // Fallback para backends que no aplican/soportan bien el filtro de summary.
      const full = await SolicitudVentaService.getSolicitudes();
      const pending = full
        .filter((s) => {
          if (s.estado?.toLowerCase() === "anulada") return false;
          if (s.pagada_totalmente === false) return true;
          const pendiente = Number(s.saldo_pendiente ?? 0);
          return Number.isFinite(pendiente) && pendiente > 0;
        })
        .map(toSummaryFromSolicitud);
      setSolicitudesPendientes(pending);
    } catch (e) {
      setErrorSolicitudes(e instanceof Error ? e.message : "Error al cargar solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  const fetchTodasSolicitudes = useCallback(async () => {
    setLoadingTodasSolicitudes(true);
    setErrorTodasSolicitudes(null);
    try {
      const { data } = await SolicitudVentaService.getSolicitudesSummary({
        pagada_totalmente: true,
      });

      if (Array.isArray(data) && data.length > 0) {
        setTodasSolicitudes(data);
        return;
      }

      // Fallback para backends que no aplican/soportan bien el filtro de summary.
      const full = await SolicitudVentaService.getSolicitudes();
      const paid = full
        .filter((s) => {
          if (s.estado?.toLowerCase() === "anulada") return false;
          if (s.pagada_totalmente === true) return true;
          const pendiente = Number(s.saldo_pendiente ?? 0);
          return Number.isFinite(pendiente) && pendiente === 0;
        })
        .map(toSummaryFromSolicitud);
      setTodasSolicitudes(paid);
    } catch (e) {
      setErrorTodasSolicitudes(e instanceof Error ? e.message : "Error al cargar solicitudes");
    } finally {
      setLoadingTodasSolicitudes(false);
    }
  }, []);

  const fetchTodosPagos = useCallback(async () => {
    setLoadingPagos(true);
    setErrorPagos(null);
    try {
      const data = await PagoVentaService.getTodosPagos();
      setTodosPagos(data);
    } catch (e) {
      setErrorPagos(e instanceof Error ? e.message : "Error al cargar pagos");
    } finally {
      setLoadingPagos(false);
    }
  }, []);

  const fetchFacturas = useCallback(async () => {
    setLoadingFacturas(true);
    setErrorFacturas(null);
    try {
      const data = await FacturaClienteVentaService.getFacturas();
      const sorted = [...data].sort((a, b) => {
        const num = (f: typeof a) => {
          const n = f.numero_factura ?? "";
          const m = n.match(/(\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        };
        return num(b) - num(a);
      });
      setFacturas(sorted);
    } catch (e) {
      setErrorFacturas(
        e instanceof Error ? e.message : "Error al cargar facturas",
      );
    } finally {
      setLoadingFacturas(false);
    }
  }, []);

  const registrarPago = useCallback(
    async (data: PagoVentaCreateData): Promise<PagoVenta> => {
      const pago = await PagoVentaService.registrarPago(data);
      await Promise.all([fetchSolicitudesPendientes(), fetchTodosPagos()]);
      return pago;
    },
    [fetchSolicitudesPendientes, fetchTodosPagos],
  );

  const crearFactura = useCallback(
    async (data: FacturaClienteVentaCreateData): Promise<FacturaClienteVenta> => {
      const factura = await FacturaClienteVentaService.crearFactura(data);
      await fetchFacturas();
      return factura;
    },
    [fetchFacturas],
  );

  const eliminarFactura = useCallback(async (id: string): Promise<void> => {
    await FacturaClienteVentaService.eliminarFactura(id);
    setFacturas((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    solicitudesPendientes,
    todasSolicitudes,
    todosPagos,
    facturas,
    loadingSolicitudes,
    loadingTodasSolicitudes,
    loadingPagos,
    loadingFacturas,
    errorSolicitudes,
    errorTodasSolicitudes,
    errorPagos,
    errorFacturas,
    fetchSolicitudesPendientes,
    fetchTodasSolicitudes,
    fetchTodosPagos,
    fetchFacturas,
    registrarPago,
    crearFactura,
    eliminarFactura,
  };
}
