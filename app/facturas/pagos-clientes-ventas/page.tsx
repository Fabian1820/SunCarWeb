"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/atom/button";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { usePagosClientesVentas } from "@/hooks/use-pagos-clientes-ventas";
import { SolicitudesPendientesPagoTable } from "@/components/feats/pagos-clientes-ventas/solicitudes-pendientes-pago-table";
import { FacturasVentasTable } from "@/components/feats/pagos-clientes-ventas/facturas-ventas-table";
import { RegistrarPagoVentaDialog } from "@/components/feats/pagos-clientes-ventas/registrar-pago-venta-dialog";
import { CrearFacturaVentaDialog } from "@/components/feats/pagos-clientes-ventas/crear-factura-venta-dialog";
import type { SolicitudVentaSummary } from "@/lib/api-types";
import type { FacturaClienteVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { PagoVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import {
  ArrowLeft,
  CreditCard,
  List,
  FileText,
  ShoppingCart,
} from "lucide-react";

type TabId = "solicitudes-pendientes" | "todos-pagos" | "facturas-emitidas";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  {
    id: "solicitudes-pendientes",
    label: "Solicitudes pendientes de pago",
    icon: ShoppingCart,
  },
  { id: "todos-pagos", label: "Todos los pagos", icon: List },
  { id: "facturas-emitidas", label: "Facturas emitidas", icon: FileText },
];

export default function PagosClientesVentasPage() {
  const { toast } = useToast();
  const {
    solicitudesPendientes,
    todasSolicitudes,
    facturas,
    loadingSolicitudes,
    loadingTodasSolicitudes,
    loadingFacturas,
    errorSolicitudes,
    errorTodasSolicitudes,
    errorFacturas,
    fetchSolicitudesPendientes,
    fetchTodasSolicitudes,
    fetchFacturas,
    registrarPago,
    crearFactura,
    eliminarFactura,
  } = usePagosClientesVentas();

  const [activeTab, setActiveTab] = useState<TabId>("solicitudes-pendientes");
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false);
  const [facturaDialogOpen, setFacturaDialogOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] =
    useState<SolicitudVentaSummary | null>(null);

  useEffect(() => {
    fetchSolicitudesPendientes();
  }, [fetchSolicitudesPendientes]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "todos-pagos" && todasSolicitudes.length === 0) fetchTodasSolicitudes();
    if (tab === "facturas-emitidas" && facturas.length === 0) fetchFacturas();
  };

  const handlePagar = (solicitud: SolicitudVentaSummary) => {
    setSelectedSolicitud(solicitud);
    setPagoDialogOpen(true);
  };

  const handleEmitirFactura = (solicitud: SolicitudVentaSummary) => {
    setSelectedSolicitud(solicitud);
    setFacturaDialogOpen(true);
  };

  const handleRegistrarPago = async (data: Parameters<typeof registrarPago>[0] & {
    factura?: { numero_factura: string; fecha_emision: string };
  }) => {
    const { factura, ...pagoData } = data;
    const pagoCreado = await registrarPago(pagoData);
    if (factura) {
      try {
        await crearFactura({
          solicitud_venta_id: pagoData.solicitud_venta_id,
          numero_factura: factura.numero_factura,
          emitida_por: pagoData.recibido_por,
          fecha_emision: factura.fecha_emision,
        });
        toast({ title: "Pago y factura registrados", description: `Pago registrado. Factura ${factura.numero_factura} emitida.` });
      } catch (e) {
        // Rollback: si falla la creación de la factura, revertir el pago.
        let rollbackOk = false;
        try {
          if (pagoCreado?.id) {
            await PagoVentaService.eliminarPago(pagoCreado.id);
            rollbackOk = true;
          }
        } catch (rollbackErr) {
          console.error("[handleRegistrarPago] rollback del pago falló", rollbackErr);
        }
        toast({
          title: rollbackOk ? "Pago revertido" : "Pago registrado, pero no se pudo crear la factura",
          description: rollbackOk
            ? "No se pudo crear la factura, el pago fue revertido. Intenta de nuevo."
            : (e instanceof Error ? e.message : "Error al crear la factura") +
              ". Contacta a soporte para revertir el pago manualmente.",
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Pago registrado", description: "El pago se registró correctamente." });
    }
  };

  const handleCrearFactura = async (
    data: Parameters<typeof crearFactura>[0],
  ) => {
    await crearFactura(data);
    toast({
      title: "Factura emitida",
      description: "La factura se creó correctamente.",
    });
    await fetchFacturas();
  };

  const handleEliminarFactura = async (factura: FacturaClienteVenta) => {
    if (
      !confirm(
        `¿Eliminar la factura ${factura.numero_factura}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await eliminarFactura(factura.id);
      toast({
        title: "Factura eliminada",
        description: `Factura ${factura.numero_factura} eliminada.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "No se pudo eliminar la factura",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <header className="fixed-header bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/facturas">
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation h-9 w-9 sm:h-10 sm:auto sm:px-4 sm:rounded-md gap-2"
                  aria-label="Volver a Facturación"
                  title="Volver a Facturación"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
              </Link>
              <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0 p-1.5 sm:p-2">
                <img
                  src="/brand/suncar-v1-iso.png"
                  alt="Logo Suncar"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  Pagos Clientes Ventas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Facturación
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Gestión de pagos y facturas de solicitudes de ventas
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-green-600 text-green-700 bg-green-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "solicitudes-pendientes" && (
          <SolicitudesPendientesPagoTable
            solicitudes={solicitudesPendientes}
            loading={loadingSolicitudes}
            error={errorSolicitudes}
            onRefresh={fetchSolicitudesPendientes}
            onPagar={handlePagar}
          />
        )}

        {activeTab === "todos-pagos" && (
          <SolicitudesPendientesPagoTable
            solicitudes={todasSolicitudes}
            loading={loadingTodasSolicitudes}
            error={errorTodasSolicitudes}
            onRefresh={fetchTodasSolicitudes}
          />
        )}

        {activeTab === "facturas-emitidas" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => {
                  if (solicitudesPendientes.length > 0) {
                    handleEmitirFactura(solicitudesPendientes[0]);
                  } else {
                    fetchSolicitudesPendientes().then(() => {
                      setFacturaDialogOpen(true);
                    });
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                Emitir Factura
              </Button>
            </div>
            <FacturasVentasTable
              facturas={facturas}
              loading={loadingFacturas}
              error={errorFacturas}
              onRefresh={fetchFacturas}
              onEliminar={handleEliminarFactura}
            />
          </div>
        )}
      </main>

      <RegistrarPagoVentaDialog
        open={pagoDialogOpen}
        onOpenChange={setPagoDialogOpen}
        solicitud={selectedSolicitud}
        onSubmit={handleRegistrarPago}
      />

      <CrearFacturaVentaDialog
        open={facturaDialogOpen}
        onOpenChange={setFacturaDialogOpen}
        solicitud={selectedSolicitud}
        onSubmit={handleCrearFactura}
      />

      <Toaster />
    </div>
  );
}
