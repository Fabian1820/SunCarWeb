"use client";

import { useState, useEffect } from "react";
import { Plus, Search, ShoppingCart, CreditCard, List, FileText } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { useToast } from "@/hooks/use-toast";
import { useSolicitudesVentas } from "@/hooks/use-solicitudes-ventas";
import { usePagosClientesVentas } from "@/hooks/use-pagos-clientes-ventas";
import { SolicitudesVentasTable } from "@/components/feats/solicitudes-ventas/solicitudes-ventas-table";
import { SolicitudVentaDetailDialog } from "@/components/feats/solicitudes-ventas/solicitud-venta-detail-dialog";
import { UpsertSolicitudVentaDialog } from "@/components/feats/solicitudes-ventas/upsert-solicitud-venta-dialog";
import { AnularSolicitudDialog } from "@/components/shared/molecule/anular-solicitud-dialog";
import { SolicitudesPendientesPagoTable } from "@/components/feats/pagos-clientes-ventas/solicitudes-pendientes-pago-table";
import { FacturasVentasTable } from "@/components/feats/pagos-clientes-ventas/facturas-ventas-table";
import { TodosPagosVentasTable } from "@/components/feats/pagos-clientes-ventas/todos-pagos-ventas-table";
import { RegistrarPagoVentaDialog } from "@/components/feats/pagos-clientes-ventas/registrar-pago-venta-dialog";
import { CrearFacturaVentaDialog } from "@/components/feats/pagos-clientes-ventas/crear-factura-venta-dialog";
import { FacturaVentaDetailDialog } from "@/components/feats/pagos-clientes-ventas/factura-venta-detail-dialog";
import { StripePagosSolicitudesModal } from "@/components/feats/solicitudes-ventas/stripe-pagos-solicitudes-modal";
import type {
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
  SolicitudVentaSummary,
} from "@/lib/api-types";
import type {
  FacturaClienteVenta,
  FacturaVentaResumen,
} from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";
import { SolicitudVentaService } from "@/lib/api-services";
import {
  generarConduceLegal,
  generarCertificadoGarantia,
  generarAmbos,
} from "@/lib/services/feats/solicitudes-ventas/export-solicitud-venta-word-service";
import { ExportFacturaVentaConsolidadaService } from "@/lib/services/feats/pagos-clientes-ventas/export-factura-venta-consolidada-service";
import type { ExportTipo } from "@/components/feats/solicitudes-ventas/solicitudes-ventas-table";
import { FacturaClienteVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";

type TabId = "solicitudes" | "pendientes-pago" | "pagos-realizados" | "facturas-emitidas";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "solicitudes",       label: "Solicitudes",             icon: ShoppingCart },
  { id: "pendientes-pago",   label: "Pendientes de pago",      icon: CreditCard   },
  { id: "pagos-realizados",  label: "Pagos realizados",        icon: List         },
  { id: "facturas-emitidas", label: "Facturas emitidas",       icon: FileText     },
];

export default function SolicitudesVentasPage() {
  const { toast } = useToast();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("solicitudes");

  // ── Hook existente de solicitudes ──────────────────────────────────────────
  const {
    filteredSolicitudes,
    loading,
    searchTerm,
    setSearchTerm,
    loadMore,
    hasMore,
    loadSolicitudes,
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
  } = useSolicitudesVentas();

  // ── Hook de pagos ──────────────────────────────────────────────────────────
  const {
    solicitudesPendientes,
    todosPagos,
    facturas,
    loadingSolicitudes,
    loadingPagos,
    loadingFacturas,
    errorSolicitudes,
    errorPagos,
    errorFacturas,
    fetchSolicitudesPendientes,
    fetchTodosPagos,
    fetchFacturas,
    registrarPago,
    crearFactura,
    eliminarFactura,
  } = usePagosClientesVentas();

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [isCreateDialogOpen, setIsCreateDialogOpen]   = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen]       = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen]   = useState(false);
  const [isAnularDialogOpen, setIsAnularDialogOpen]   = useState(false);
  const [pagoDialogOpen, setPagoDialogOpen]           = useState(false);
  const [facturaDialogOpen, setFacturaDialogOpen]     = useState(false);
  const [stripePagosOpen, setStripePagosOpen]         = useState(false);
  const [stripeSolicitudFiltro, setStripeSolicitudFiltro] = useState<string | undefined>(undefined);

  const [selectedSolicitud, setSelectedSolicitud]     = useState<SolicitudVenta | null>(null);
  const [solicitudParaPagar, setSolicitudParaPagar]   = useState<SolicitudVentaSummary | null>(null);
  const [solicitudParaPagarCompleta, setSolicitudParaPagarCompleta] = useState<SolicitudVenta | null>(null);
  const [facturaAsociadaNumero, setFacturaAsociadaNumero] = useState<string | null>(null);
  const [solicitudToAnular, setSolicitudToAnular]     = useState<SolicitudVenta | null>(null);
  const [facturaDetalle, setFacturaDetalle]           = useState<FacturaVentaResumen | null>(null);
  const [anularLoading, setAnularLoading]             = useState(false);

  // ── Carga lazy por pestaña ─────────────────────────────────────────────────
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "pendientes-pago"   && solicitudesPendientes.length === 0) fetchSolicitudesPendientes();
    if (tab === "pagos-realizados"  && todosPagos.length === 0)            fetchTodosPagos();
    if (tab === "facturas-emitidas" && facturas.length === 0)              fetchFacturas();
  };

  // ── Loader solo en la primera pestaña ──────────────────────────────────────
  if (activeTab === "solicitudes" && loading && filteredSolicitudes.length === 0) {
    return (
      <PageLoader
        moduleName="Solicitudes Ventas"
        text="Cargando solicitudes de ventas..."
      />
    );
  }

  const getSolicitudCodigo = (solicitud: SolicitudVenta) =>
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  // ── Handlers solicitudes (sin cambios) ────────────────────────────────────
  const handleCreate = async (data: SolicitudVentaCreateData | SolicitudVentaUpdateData) => {
    const clienteVentaId = data.cliente_venta_id?.trim();
    if (!clienteVentaId) throw new Error("Debe seleccionar un cliente venta");
    if (!data.almacen_id?.trim()) throw new Error("Debe seleccionar un almacen");
    if (!data.materiales || data.materiales.length === 0) throw new Error("Debe agregar al menos un material");
    try {
      await createSolicitud({ cliente_venta_id: clienteVentaId, almacen_id: data.almacen_id, materiales: data.materiales });
      toast({ title: "Exito", description: "Solicitud de venta creada correctamente" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo crear la solicitud de venta", variant: "destructive" });
      throw error;
    }
  };

  const handleEdit = async (data: SolicitudVentaUpdateData) => {
    if (!selectedSolicitud) return;
    if (selectedSolicitud.estado?.toLowerCase() !== "nueva") {
      const error = new Error("Solo se puede editar una solicitud de venta con estado nueva.");
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
    try {
      await updateSolicitud(selectedSolicitud.id, data);
      toast({ title: "Exito", description: "Solicitud de venta actualizada correctamente" });
      setSelectedSolicitud(null);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo actualizar la solicitud", variant: "destructive" });
      throw error;
    }
  };

  const handleEditSolicitud = async (solicitud: SolicitudVentaSummary) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({ title: "Accion no permitida", description: "Solo se puede editar una solicitud de venta con estado nueva.", variant: "destructive" });
      return;
    }
    try {
      const completa = await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!completa) { toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" }); return; }
      setSelectedSolicitud(completa);
      setIsEditDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" });
    }
  };

  const handleOpenAnularSolicitud = async (solicitud: SolicitudVentaSummary) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({ title: "Accion no permitida", description: "Solo se puede anular una solicitud de venta con estado nueva.", variant: "destructive" });
      return;
    }
    try {
      const completa = await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!completa) { toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" }); return; }
      setSolicitudToAnular(completa);
      setIsAnularDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" });
    }
  };

  const handleConfirmAnularSolicitud = async (motivo: string) => {
    if (!solicitudToAnular) return;
    setAnularLoading(true);
    try {
      const response = await anularSolicitud(solicitudToAnular.id, { motivo_anulacion: motivo });
      toast({ title: "Exito", description: `Solicitud ${getSolicitudCodigo(response)} anulada correctamente.` });
      setIsAnularDialogOpen(false);
      setSolicitudToAnular(null);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo anular la solicitud de venta", variant: "destructive" });
    } finally {
      setAnularLoading(false);
    }
  };

  const handleReabrirSolicitud = async (solicitud: SolicitudVentaSummary) => {
    if (solicitud.estado?.toLowerCase() !== "anulada") {
      toast({ title: "Accion no permitida", description: "Solo se puede reabrir una solicitud anulada.", variant: "destructive" });
      return;
    }
    try {
      const nueva = await reabrirSolicitud(solicitud.id);
      toast({ title: "Exito", description: `Se creo la nueva solicitud ${getSolicitudCodigo(nueva)} a partir de ${solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}.` });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo reabrir solicitud de venta", variant: "destructive" });
    }
  };

  const handleExportar = async (solicitud: SolicitudVentaSummary, tipo: ExportTipo) => {
    try {
      const completa = await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!completa) { toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" }); return; }
      if (tipo === "conduce") await generarConduceLegal(completa);
      else if (tipo === "garantia") await generarCertificadoGarantia(completa);
      else await generarAmbos(completa);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo generar el documento", variant: "destructive" });
    }
  };

  const handleViewSolicitud = async (solicitud: SolicitudVentaSummary) => {
    try {
      const completa = await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!completa) { toast({ title: "Error", description: "No se pudo cargar la solicitud", variant: "destructive" }); return; }
      setSelectedSolicitud(completa);
      setIsDetailDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar los detalles de la solicitud", variant: "destructive" });
    }
  };

  // ── Handlers pagos ─────────────────────────────────────────────────────────
  const handlePagar = async (solicitud: SolicitudVentaSummary) => {
    const pendiente = Number(solicitud.monto_pendiente ?? NaN);
    if (Number.isFinite(pendiente) && pendiente <= 0) {
      toast({
        title: "Sin pendiente",
        description: "Esta solicitud no tiene monto pendiente para pagar.",
      });
      return;
    }
    setSolicitudParaPagar(solicitud);
    setFacturaAsociadaNumero(null);
    try {
      const completa = await SolicitudVentaService.getSolicitudById(solicitud.id);
      setSolicitudParaPagarCompleta(completa);
    } catch {
      setSolicitudParaPagarCompleta(null);
    }
    try {
      const allFacturas = await FacturaClienteVentaService.getFacturas();
      const numero = allFacturas.find((f) => {
        const byId = f.solicitud_venta_id && f.solicitud_venta_id === solicitud.id;
        const byCodigo =
          Array.isArray(f.codigos_solicitudes) &&
          Boolean(solicitud.codigo) &&
          f.codigos_solicitudes.includes(solicitud.codigo as string);
        return byId || byCodigo;
      })?.numero_factura;
      setFacturaAsociadaNumero(numero || null);
    } catch {
      setFacturaAsociadaNumero(null);
    }
    setPagoDialogOpen(true);
  };

  const handleRegistrarPago = async (
    data: Parameters<typeof registrarPago>[0] & {
      factura?: { numero_factura: string; fecha_emision: string };
    },
  ) => {
    const { factura, ...pagoData } = data;
    await registrarPago(pagoData);
    let facturaCreada: FacturaClienteVenta | null = null;
    if (factura && !facturaAsociadaNumero) {
      try {
        facturaCreada = await crearFactura({
          fecha: pagoData.fecha,
          cliente_venta_id: solicitudParaPagar?.cliente_venta_id || "",
          solicitudes: [{ solicitud_venta_id: pagoData.solicitud_venta_id }],
          numero_factura: factura.numero_factura,
          fecha_emision: factura.fecha_emision,
        });
      } catch (e) {
        toast({
          title: "Pago registrado, pero no se pudo crear la factura",
          description: e instanceof Error ? e.message : "Error al crear la factura",
          variant: "destructive",
        });
      }
    }
    void loadSolicitudes();
    toast({
      title: "Pago registrado",
      description: facturaAsociadaNumero
        ? `Pago agregado a la factura ${facturaAsociadaNumero}.`
        : facturaCreada
        ? `Pago registrado. Factura ${facturaCreada.numero_factura ?? factura?.numero_factura ?? ""} creada.`
        : "El pago se registró correctamente.",
    });
  };

  const handleEmitirFactura = () => {
    if (solicitudesPendientes.length > 0) {
      setSolicitudParaPagar(solicitudesPendientes[0]);
    }
    setFacturaDialogOpen(true);
  };

  const handleCrearFactura = async (data: Parameters<typeof crearFactura>[0]) => {
    await crearFactura(data);
    toast({ title: "Factura emitida", description: "La factura se creó correctamente." });
  };

  const handleEliminarFactura = async (factura: FacturaClienteVenta) => {
    if (!confirm(`¿Eliminar la factura ${factura.numero_factura}? Esta acción no se puede deshacer.`)) return;
    try {
      const facturaId = factura.id || factura.factura_id;
      if (!facturaId) {
        throw new Error("La factura no tiene ID para eliminar.");
      }
      await eliminarFactura(facturaId);
      toast({ title: "Factura eliminada", description: `Factura ${factura.numero_factura} eliminada.` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo eliminar la factura", variant: "destructive" });
    }
  };

  const handleVerDetalleFactura = async (factura: FacturaClienteVenta) => {
    try {
      const facturaId = factura.id || factura.factura_id;
      if (!facturaId) throw new Error("Factura sin ID.");
      const resumen = await FacturaClienteVentaService.getFacturaResumen(facturaId);
      setFacturaDetalle(resumen);
    } catch (e) {
      toast({
        title: "Error al cargar detalles",
        description: e instanceof Error ? e.message : "No se pudo cargar el resumen de factura",
        variant: "destructive",
      });
    }
  };

  const handleExportarFactura = async (factura: FacturaClienteVenta) => {
    try {
      const facturaId = factura.id || factura.factura_id;
      if (!facturaId) throw new Error("Factura sin ID.");
      const resumen = await FacturaClienteVentaService.getFacturaResumen(facturaId);
      await ExportFacturaVentaConsolidadaService.exportarPDF(resumen);
      toast({
        title: "Factura exportada",
        description: `Se exportó ${factura.numero_factura}`,
      });
    } catch (e) {
      toast({
        title: "Error al exportar",
        description: e instanceof Error ? e.message : "No se pudo exportar la factura",
        variant: "destructive",
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Solicitudes Ventas"
        subtitle="Crea y gestiona solicitudes de ventas con materiales vendibles"
        badge={{ text: "Ventas", className: "bg-indigo-100 text-indigo-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          activeTab === "solicitudes" ? (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-md touch-manipulation"
                onClick={() => setIsCreateDialogOpen(true)}
                aria-label="Nueva solicitud de venta"
                title="Nueva solicitud"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nueva Solicitud</span>
                <span className="sr-only">Nueva solicitud</span>
              </Button>
            </div>
          ) : activeTab === "facturas-emitidas" ? (
            <Button
              className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white gap-2 touch-manipulation"
              onClick={handleEmitirFactura}
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Emitir Factura</span>
            </Button>
          ) : null
        }
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">

        {/* ── Pestañas ── */}
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
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50"
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

        {/* ── Pestaña 1: Solicitudes ── */}
        {activeTab === "solicitudes" && (
          <Card className="border-l-4 border-l-indigo-600 overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Solicitudes de Venta
              </CardTitle>
              <CardDescription>
                {filteredSolicitudes.length} solicitud{filteredSolicitudes.length !== 1 ? "es" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, cliente, almacén o trabajador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {filteredSolicitudes.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm px-6 pb-6">
                  {searchTerm ? "No se encontraron solicitudes con ese criterio" : "No hay solicitudes"}
                </div>
              ) : (
                <div className="border-t overflow-x-auto">
                  <SolicitudesVentasTable
                    solicitudes={filteredSolicitudes}
                    onView={(s) => { void handleViewSolicitud(s); }}
                    onEdit={(s) => { void handleEditSolicitud(s); }}
                    onAnular={(s) => { void handleOpenAnularSolicitud(s); }}
                    onReabrir={(s) => { void handleReabrirSolicitud(s); }}
                    onExportar={(s, tipo) => { void handleExportar(s, tipo); }}
                  />
                </div>
              )}
              {hasMore && filteredSolicitudes.length > 0 && (
                <div className="text-center px-6 py-4 border-t">
                  <Button
                    onClick={() => void loadMore()}
                    disabled={loading}
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    {loading ? "Cargando..." : "Cargar más solicitudes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Pestaña 2: Pendientes de pago ── */}
        {activeTab === "pendientes-pago" && (
          <Card className="border-l-4 border-l-indigo-600 overflow-hidden">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    Pendientes de Pago
                  </CardTitle>
                  <CardDescription>Solicitudes con saldo pendiente de cobro</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => { setStripeSolicitudFiltro(undefined); setStripePagosOpen(true); }}
                >
                  <CreditCard className="h-4 w-4" />
                  Cobros Stripe
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SolicitudesPendientesPagoTable
                solicitudes={solicitudesPendientes}
                loading={loadingSolicitudes}
                error={errorSolicitudes}
                onRefresh={fetchSolicitudesPendientes}
                onPagar={handlePagar}
                onVerStripe={(s) => { setStripeSolicitudFiltro(s.id); setStripePagosOpen(true); }}
                variant="embedded"
              />
            </CardContent>
          </Card>
        )}

        {/* ── Pestaña 3: Pagos realizados ── */}
        {activeTab === "pagos-realizados" && (
          <Card className="border-l-4 border-l-indigo-600 overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <List className="h-5 w-5 text-indigo-600" />
                Pagos Realizados
              </CardTitle>
              <CardDescription>Solicitudes con pago completado</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 py-4">
                <TodosPagosVentasTable
                  pagos={todosPagos}
                  loading={loadingPagos}
                  error={errorPagos}
                  onRefresh={fetchTodosPagos}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pestaña 4: Facturas emitidas ── */}
        {activeTab === "facturas-emitidas" && (
          <Card className="border-l-4 border-l-indigo-600 overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-indigo-600" />
                Facturas Emitidas
              </CardTitle>
              <CardDescription>Facturas generadas para solicitudes de venta</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <FacturasVentasTable
                facturas={facturas}
                loading={loadingFacturas}
                error={errorFacturas}
                onRefresh={fetchFacturas}
                onVerDetalles={handleVerDetalleFactura}
                onExportar={(f) => { void handleExportarFactura(f); }}
                onEliminar={handleEliminarFactura}
                variant="embedded"
              />
            </CardContent>
          </Card>
        )}
      </main>

      {/* ── Dialogs solicitudes ── */}
      <UpsertSolicitudVentaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      <UpsertSolicitudVentaDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedSolicitud(null); }}
        onSubmit={handleEdit}
        solicitud={selectedSolicitud}
      />

      <SolicitudVentaDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setSelectedSolicitud(null); }}
        solicitud={selectedSolicitud}
      />

      <AnularSolicitudDialog
        open={isAnularDialogOpen}
        onOpenChange={(open) => { setIsAnularDialogOpen(open); if (!open) setSolicitudToAnular(null); }}
        solicitudCodigo={solicitudToAnular ? getSolicitudCodigo(solicitudToAnular) : null}
        solicitudTipo="venta"
        onConfirm={handleConfirmAnularSolicitud}
        isLoading={anularLoading}
      />

      {/* ── Dialogs pagos ── */}
      <RegistrarPagoVentaDialog
        open={pagoDialogOpen}
        onOpenChange={(open) => {
          setPagoDialogOpen(open);
          if (!open) {
            setSolicitudParaPagarCompleta(null);
            setFacturaAsociadaNumero(null);
          }
        }}
        solicitud={solicitudParaPagar}
        solicitudCompleta={solicitudParaPagarCompleta}
        facturaAsociadaNumero={facturaAsociadaNumero}
        bloquearConfiguracionPago={Boolean((solicitudParaPagar?.total_pagado ?? 0) > 0)}
        onSubmit={handleRegistrarPago}
      />

      <CrearFacturaVentaDialog
        open={facturaDialogOpen}
        onOpenChange={setFacturaDialogOpen}
        solicitud={solicitudParaPagar}
        onSubmit={handleCrearFactura}
      />

      <FacturaVentaDetailDialog
        open={Boolean(facturaDetalle)}
        onOpenChange={(open) => {
          if (!open) setFacturaDetalle(null);
        }}
        factura={facturaDetalle}
      />

      <StripePagosSolicitudesModal
        open={stripePagosOpen}
        onOpenChange={(v) => { setStripePagosOpen(v); if (!v) setStripeSolicitudFiltro(undefined); }}
        solicitudId={stripeSolicitudFiltro}
      />

      <Toaster />
    </div>
  );
}
