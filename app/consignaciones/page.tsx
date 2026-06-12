"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { useToast } from "@/hooks/use-toast";
import { useConsignaciones } from "@/hooks/use-consignaciones";
import { ConsignacionesTable } from "@/components/feats/consignaciones/consignaciones-table";
import { ConsignacionDetailDialog } from "@/components/feats/consignaciones/consignacion-detail-dialog";
import { RegistrarDevolucionDialog } from "@/components/feats/consignaciones/registrar-devolucion-dialog";
import { VincularPagoDialog } from "@/components/feats/consignaciones/vincular-pago-dialog";
import { EmitirFacturaConsignacionDialog } from "@/components/feats/consignaciones/emitir-factura-consignacion-dialog";
import { RegistrarPagoVentaDialog } from "@/components/feats/pagos-clientes-ventas/registrar-pago-venta-dialog";
import type {
  Consignacion,
  ConsignacionEstado,
  PagoResumenConsignacion,
} from "@/lib/types/feats/consignaciones/consignacion-types";
import type { SolicitudVentaSummary } from "@/lib/api-types";
import { ConsignacionService } from "@/lib/services/feats/consignaciones/consignacion-service";
import { PagoVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";

export default function ConsignacionesPage() {
  const { toast } = useToast();
  const {
    consignaciones,
    total,
    loading,
    error,
    fetchConsignaciones,
    vincularPago,
    anular,
    refrescar,
  } = useConsignaciones();

  const [estadoFiltro, setEstadoFiltro] = useState<ConsignacionEstado | "todos">(
    "todos",
  );

  const [detalle, setDetalle] = useState<Consignacion | null>(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [openDevolucion, setOpenDevolucion] = useState(false);
  const [openVincularPago, setOpenVincularPago] = useState(false);
  const [openPago, setOpenPago] = useState(false);
  const [openFactura, setOpenFactura] = useState(false);
  const [pagoParaFacturar, setPagoParaFacturar] = useState<PagoResumenConsignacion | null>(null);
  const [consignacionActiva, setConsignacionActiva] =
    useState<Consignacion | null>(null);

  useEffect(() => {
    void fetchConsignaciones(
      estadoFiltro === "todos" ? {} : { estado: estadoFiltro },
    );
  }, [estadoFiltro, fetchConsignaciones]);

  const handleVer = (c: Consignacion) => {
    setDetalle(c);
    setOpenDetalle(true);
  };

  const handleAbrirDevolucion = (c: Consignacion) => {
    setConsignacionActiva(c);
    setOpenDevolucion(true);
  };

  const handleAbrirVincularPago = (c: Consignacion) => {
    setConsignacionActiva(c);
    setOpenVincularPago(true);
  };

  // Abre el dialog de registrar pago normal para la solicitud de la consignación
  const handleAbrirPago = (c: Consignacion) => {
    setConsignacionActiva(c);
    setOpenPago(true);
  };

  const handleAbrirFactura = (c: Consignacion, pago: PagoResumenConsignacion) => {
    setConsignacionActiva(c);
    setPagoParaFacturar(pago);
    setOpenFactura(true);
  };

  const handlePagoRegistrado = async (data: Parameters<typeof PagoVentaService.registrarPago>[0]) => {
    await PagoVentaService.registrarPago(data);
    toast({
      title: "Pago registrado",
      description: "El saldo de la consignación se actualizará automáticamente.",
    });
    if (consignacionActiva) {
      try {
        const fresca = await refrescar(consignacionActiva.id);
        setDetalle(fresca);
      } catch {/* no-op */}
    }
  };

  const handleFacturaEmitida = async (data: {
    pago_venta_id: string;
    numero_factura: string;
    fecha_emision: string;
  }) => {
    if (!consignacionActiva) return;
    await ConsignacionService.emitirFactura(consignacionActiva.id, data);
    toast({ title: "Factura emitida", description: "Disponible en Solicitudes de Ventas → Facturas emitidas." });
    try {
      const fresca = await refrescar(consignacionActiva.id);
      setDetalle(fresca);
    } catch {/* no-op */}
  };

  const handleDevolucionCreada = async (consignacionId: string) => {
    toast({
      title: "Solicitud de entrada creada",
      description:
        "Apruébala desde el módulo de Almacén para aplicar la devolución y actualizar el stock.",
    });
    try {
      const fresca = await refrescar(consignacionId);
      if (detalle?.id === consignacionId) setDetalle(fresca);
    } catch {
      // si falla refresh, no es bloqueante
    }
  };

  const handleVincularPago = async (pagoVentaId: string) => {
    if (!consignacionActiva) return;
    const actualizada = await vincularPago(consignacionActiva.id, pagoVentaId);
    setDetalle(actualizada);
    toast({
      title: "Pago vinculado",
      description: `Pendiente: ${actualizada.monto_pendiente.toFixed(2)} ${actualizada.moneda}`,
    });
  };

  const handleAnular = async (c: Consignacion) => {
    const motivo = window.prompt("Motivo de la anulación:");
    if (motivo === null) return;
    try {
      const actualizada = await anular(c.id, motivo || undefined);
      setDetalle(actualizada);
      toast({ title: "Consignación anulada" });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo anular",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <ModuleHeader
        title="Consignaciones"
        subtitle="Ventas entregadas al cliente sin pago completo. Se crean desde el módulo de pagos marcando el toggle “Consignación”."
        badge={{ text: "Ventas", className: "bg-indigo-100 text-indigo-800" }}
        className="border-b border-indigo-100 bg-white shadow-sm"
      />

      <main className="content-with-fixed-header mx-auto max-w-[96rem] px-4 py-4 pb-8 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-4">
          <Card className="border border-indigo-100 bg-white shadow-sm">
            <CardHeader className="border-b border-indigo-50">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <BookmarkCheck className="h-5 w-5 text-indigo-600" />
                Consignaciones
              </CardTitle>
              <CardDescription className="text-indigo-600">
                {total > 0
                  ? `${total} consignaciones en total`
                  : "Aún no hay consignaciones registradas"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ConsignacionesTable
                consignaciones={consignaciones}
                loading={loading}
                error={error}
                onRefresh={() =>
                  fetchConsignaciones(
                    estadoFiltro === "todos" ? {} : { estado: estadoFiltro },
                  )
                }
                onVer={handleVer}
                onRegistrarPago={handleAbrirVincularPago}
                onRegistrarDevolucion={handleAbrirDevolucion}
                estadoFiltro={estadoFiltro}
                onEstadoFiltroChange={setEstadoFiltro}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <ConsignacionDetailDialog
        open={openDetalle}
        onOpenChange={setOpenDetalle}
        consignacion={detalle}
        onRegistrarPago={(c) => {
          setConsignacionActiva(c);
          setOpenPago(true);
        }}
        onRegistrarDevolucion={(c) => {
          setOpenDetalle(false);
          handleAbrirDevolucion(c);
        }}
        onAnular={handleAnular}
        onEmitirFactura={handleAbrirFactura}
      />

      <RegistrarDevolucionDialog
        open={openDevolucion}
        onOpenChange={setOpenDevolucion}
        consignacion={consignacionActiva}
        onAfterCreated={handleDevolucionCreada}
      />

      <VincularPagoDialog
        open={openVincularPago}
        onOpenChange={(next) => {
          setOpenVincularPago(next);
          if (!next && detalle && consignacionActiva?.id === detalle.id) {
            void refrescar(detalle.id).then(setDetalle).catch(() => {});
          }
        }}
        consignacion={consignacionActiva}
        onSubmit={handleVincularPago}
      />

      {/* Dialog de registrar pago — usa el flujo normal de PagoVenta */}
      <RegistrarPagoVentaDialog
        open={openPago}
        onOpenChange={setOpenPago}
        solicitud={
          consignacionActiva
            ? ({
                id: consignacionActiva.solicitud_venta_id,
                codigo: consignacionActiva.solicitud_codigo ?? undefined,
                cliente_venta_nombre: consignacionActiva.cliente_nombre ?? undefined,
                monto_pendiente: consignacionActiva.monto_pendiente,
              } as SolicitudVentaSummary)
            : null
        }
        onSubmit={handlePagoRegistrado}
      />

      {/* Dialog de emitir factura */}
      <EmitirFacturaConsignacionDialog
        open={openFactura}
        onOpenChange={setOpenFactura}
        consignacion={consignacionActiva}
        pago={pagoParaFacturar}
        onSubmit={handleFacturaEmitida}
      />

      <Toaster />
    </div>
  );
}
