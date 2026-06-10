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
import type {
  Consignacion,
  ConsignacionEstado,
} from "@/lib/types/feats/consignaciones/consignacion-types";

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
          setOpenDetalle(false);
          handleAbrirVincularPago(c);
        }}
        onRegistrarDevolucion={(c) => {
          setOpenDetalle(false);
          handleAbrirDevolucion(c);
        }}
        onAnular={handleAnular}
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

      <Toaster />
    </div>
  );
}
