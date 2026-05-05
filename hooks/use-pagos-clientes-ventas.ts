"use client";

import { useState, useCallback } from "react";
import {
  PagoVentaService,
  FacturaClienteVentaService,
} from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import { SolicitudVentaService } from "@/lib/services/feats/solicitudes-ventas/solicitud-venta-service";
import type { SolicitudVenta } from "@/lib/api-types";
import type {
  PagoVenta,
  PagoVentaCreateData,
  FacturaClienteVenta,
  FacturaClienteVentaCreateData,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

export function usePagosClientesVentas() {
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<
    SolicitudVenta[]
  >([]);
  const [todasSolicitudes, setTodasSolicitudes] = useState<SolicitudVenta[]>([]);
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
      const data = await PagoVentaService.getSolicitudesPendientes();
      setSolicitudesPendientes(data);
    } catch (e) {
      setErrorSolicitudes(
        e instanceof Error ? e.message : "Error al cargar solicitudes",
      );
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  const fetchTodasSolicitudes = useCallback(async () => {
    setLoadingTodasSolicitudes(true);
    setErrorTodasSolicitudes(null);
    try {
      const todas = await SolicitudVentaService.getSolicitudes({ pagada_totalmente: true });
      setTodasSolicitudes(todas);
    } catch (e) {
      setErrorTodasSolicitudes(
        e instanceof Error ? e.message : "Error al cargar solicitudes",
      );
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
      setFacturas(data);
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
