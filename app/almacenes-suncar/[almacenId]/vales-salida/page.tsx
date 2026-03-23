"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import {
  Search,
  FileOutput,
  Plus,
  Loader2,
  ClipboardList,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { ValeSalidaService } from "@/lib/api-services";
import { ExportValeSalidaService } from "@/lib/services/feats/vales-salida/export-vale-salida-service";
import { useToast } from "@/hooks/use-toast";
import { useValesSalida } from "@/hooks/use-vales-salida";
import { ValesSalidaTable } from "@/components/feats/vales-salida/vales-salida-table";
import { CreateValeSalidaDialog } from "@/components/feats/vales-salida/create-vale-salida-dialog";
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog";
import { DevolucionValeDialog } from "@/components/feats/vales-salida/devolucion-vale-dialog";
import { AnularValeDialog } from "@/components/feats/vales-salida/anular-vale-dialog";
import type {
  ValeSalida,
  ValeSolicitudPendiente,
  ValeSalidaSummary,
} from "@/lib/api-types";
import {
  formatFechaRecogida,
  getFechaRecogidaBadge,
} from "@/lib/utils/fecha-recogida";

const getTipoStyles = (tipo?: string) =>
  tipo === "venta"
    ? {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        row: "hover:bg-indigo-50/30",
        button: "bg-indigo-600 hover:bg-indigo-700 text-white",
        text: "text-indigo-700",
      }
    : {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        row: "hover:bg-amber-50/30",
        button: "bg-amber-600 hover:bg-amber-700 text-white",
        text: "text-amber-700",
      };

export default function ValesSalidaPage() {
  const params = useParams();
  const almacenId = params.almacenId as string;
  const { toast } = useToast();

  const {
    vales,
    filteredVales,
    loading,
    isSearching, // Nueva bandera de búsqueda
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    loadVales,
    loadMore, // Nueva función para cargar más
    hasMore, // Flag para saber si hay más registros
    anularVale,
    total, // Total de registros
  } = useValesSalida();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDevolucionDialogOpen, setIsDevolucionDialogOpen] = useState(false);
  const [selectedVale, setSelectedVale] = useState<ValeSalida | null>(null);

  const [isAnularDialogOpen, setIsAnularDialogOpen] = useState(false);
  const [valeToAnular, setValeToAnular] = useState<ValeSalida | null>(null);
  const [anularLoading, setAnularLoading] = useState(false);

  const [prefillSolicitudId, setPrefillSolicitudId] = useState<string | null>(
    null,
  );
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<
    ValeSolicitudPendiente[]
  >([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [showSolicitudesPendientes, setShowSolicitudesPendientes] =
    useState(true);

  const loadSolicitudesPendientes = useCallback(async () => {
    setLoadingPendientes(true);
    try {
      const data = await ValeSalidaService.getSolicitudesPorAlmacen(almacenId, {
        estado: "nueva",
        incluir_con_vale: false,
        skip: 0,
        limit: 500,
      });
      setSolicitudesPendientes(data);
    } catch (error) {
      setSolicitudesPendientes([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes pendientes",
        variant: "destructive",
      });
    } finally {
      setLoadingPendientes(false);
    }
  }, [almacenId, toast]);

  useEffect(() => {
    void loadSolicitudesPendientes();
  }, [loadSolicitudesPendientes]);

  const valesAlmacen = useMemo(() => {
    return filteredVales.filter((vale) => {
      const solicitud =
        vale.solicitud_material || vale.solicitud_venta || vale.solicitud;
      const solicitudAlmacenId = solicitud?.almacen?.id;
      if (!solicitudAlmacenId) return true;
      return solicitudAlmacenId === almacenId;
    });
  }, [filteredVales, almacenId]);

  if (loading && vales.length === 0) {
    return <PageLoader moduleName="Vales de Salida" text="Cargando vales..." />;
  }

  const handleCreateSuccess = () => {
    void loadVales();
    void loadSolicitudesPendientes();
    setPrefillSolicitudId(null);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) setPrefillSolicitudId(null);
  };

  const handleOpenDevolucion = (vale: ValeSalida) => {
    setSelectedVale(vale);
    setIsDetailDialogOpen(false);
    setIsDevolucionDialogOpen(true);
  };

  const handleAnularVale = async (vale: ValeSalidaSummary) => {
    try {
      // Cargar detalles completos del vale para anular
      const valeCompleto = await ValeSalidaService.getValeById(vale.id);
      if (!valeCompleto) {
        toast({
          title: "Error",
          description: "No se pudo cargar el vale",
          variant: "destructive",
        });
        return;
      }
      setValeToAnular(valeCompleto);
      setIsAnularDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el vale",
        variant: "destructive",
      });
    }
  };

  const confirmAnular = async (motivo: string) => {
    if (!valeToAnular) return;

    setAnularLoading(true);
    try {
      const success = await anularVale(valeToAnular.id, motivo);
      if (!success) throw new Error("No se pudo anular el vale");
      toast({
        title: "Exito",
        description:
          "Vale anulado. El stock se repuso y la solicitud asociada tambien quedo anulada con el mismo motivo.",
      });
      void loadSolicitudesPendientes();
      setValeToAnular(null);
      setIsAnularDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo anular el vale",
        variant: "destructive",
      });
    } finally {
      setAnularLoading(false);
    }
  };

  const getSolicitudCode = (solicitud: ValeSolicitudPendiente) =>
    solicitud.codigo || solicitud.solicitud_id.slice(-6).toUpperCase();

  const getSolicitudCliente = (solicitud: ValeSolicitudPendiente) =>
    solicitud.cliente_venta?.nombre ||
    solicitud.cliente?.nombre ||
    "Sin cliente";

  const getRecogidaBadgeClass = (
    kind: ReturnType<typeof getFechaRecogidaBadge>["kind"],
  ) => {
    if (kind === "today" || kind === "unknown") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (kind === "tomorrow") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (kind === "future") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-red-50 text-red-700 border-red-200";
  };

  const handleCreateFromSolicitud = (solicitud: ValeSolicitudPendiente) => {
    setPrefillSolicitudId(solicitud.solicitud_id);
    setIsCreateDialogOpen(true);
  };

  const handleExportValePDF = async (vale: ValeSalidaSummary) => {
    try {
      const valeDetalle = await ValeSalidaService.getValeById(vale.id);
      if (!valeDetalle) throw new Error("No se pudo cargar el vale");
      await ExportValeSalidaService.exportarPDF(valeDetalle);
      toast({
        title: "PDF generado",
        description: `Se exporto el vale ${vale.codigo || vale.id.slice(-6).toUpperCase()} en formato PDF.`,
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el PDF del vale.",
        variant: "destructive",
      });
    }
  };

  const handleExportValeExcel = async (vale: ValeSalidaSummary) => {
    try {
      const valeDetalle = await ValeSalidaService.getValeById(vale.id);
      if (!valeDetalle) throw new Error("No se pudo cargar el vale");
      await ExportValeSalidaService.exportarExcel(valeDetalle);
      toast({
        title: "Excel generado",
        description: `Se exporto el vale ${vale.codigo || vale.id.slice(-6).toUpperCase()} en formato Excel.`,
      });
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el Excel del vale.",
        variant: "destructive",
      });
    }
  };

  const handleViewVale = async (vale: ValeSalidaSummary) => {
    try {
      // Cargar detalles completos del vale
      const valeCompleto = await ValeSalidaService.getValeById(vale.id);
      if (!valeCompleto) {
        toast({
          title: "Error",
          description: "No se pudo cargar el vale",
          variant: "destructive",
        });
        return;
      }
      setSelectedVale(valeCompleto);
      setIsDetailDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar los detalles del vale",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Vales de Salida"
        subtitle="Gestiona los vales de salida desde solicitudes de materiales y ventas"
        badge={{
          text: "Almacenes",
          className: "bg-orange-100 text-orange-800",
        }}
        className="bg-white shadow-sm border-b border-orange-100"
        backButton={{
          href: `/almacenes-suncar/${almacenId}`,
          label: "Volver al almacén",
        }}
      />

      <main className="content-with-fixed-header max-w-[98vw] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                  Solicitudes pendientes para vale
                </CardTitle>
                <CardDescription>
                  Incluye solicitudes de materiales y solicitudes de ventas en
                  estado nueva.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowSolicitudesPendientes((prevState) => !prevState)
                }
                className="shrink-0"
              >
                {showSolicitudesPendientes ? "Ocultar" : "Mostrar"}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${showSolicitudesPendientes ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          {showSolicitudesPendientes ? (
            <CardContent>
              {loadingPendientes ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando solicitudes pendientes...
                </div>
              ) : solicitudesPendientes.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">
                  No hay solicitudes nuevas pendientes para este almacén.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Tipo
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Código
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Cliente
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Materiales
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Recogida
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-900">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitudesPendientes.map((solicitud) => {
                        const styles = getTipoStyles(solicitud.tipo_solicitud);
                        const recogidaBadge = getFechaRecogidaBadge(
                          solicitud.fecha_recogida,
                        );
                        const hasStockAlert =
                          solicitud.tiene_alertas_stock === true;
                        return (
                          <tr
                            key={`${solicitud.tipo_solicitud}-${solicitud.solicitud_id}`}
                            className={`border-b border-gray-100 ${
                              hasStockAlert
                                ? "bg-red-50/40 hover:bg-red-50/70"
                                : styles.row
                            }`}
                          >
                            <td className="py-2 px-2">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
                              >
                                {solicitud.tipo_solicitud === "venta"
                                  ? "Venta"
                                  : "Material"}
                              </span>
                            </td>
                            <td
                              className={`py-2 px-2 font-mono font-medium ${styles.text}`}
                            >
                              {getSolicitudCode(solicitud)}
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              {getSolicitudCliente(solicitud)}
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              <div className="flex items-center gap-2">
                                <span>{solicitud.materiales?.length || 0}</span>
                                {hasStockAlert ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    {solicitud.total_materiales_con_alerta || 0}{" "}
                                    alerta(s)
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-gray-700">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {formatFechaRecogida(
                                      solicitud.fecha_recogida,
                                    )}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getRecogidaBadgeClass(recogidaBadge.kind)}`}
                                  >
                                    {recogidaBadge.label}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {solicitud.responsable_recogida ||
                                    solicitud.recogio_por ||
                                    solicitud.recogido_por ||
                                    solicitud.recibido_por ||
                                    "Sin responsable"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <Button
                                size="sm"
                                className={styles.button}
                                onClick={() =>
                                  handleCreateFromSolicitud(solicitud)
                                }
                                title="Crear vale desde esta solicitud"
                                disabled={
                                  solicitud.puede_generar_vale === false
                                }
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Crear vale
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          ) : null}
        </Card>

        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="search"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por código, solicitud, cliente o creador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Estado
                </Label>
                <Select
                  value={estadoFilter}
                  onValueChange={(value) =>
                    setEstadoFilter(value as "todos" | "usado" | "anulado")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="usado">Usados</SelectItem>
                    <SelectItem value="anulado">Anulados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-orange-600" />
              Vales de Salida
              {isSearching && (
                <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
              )}
            </CardTitle>
            <CardDescription>
              {isSearching ? (
                <span className="text-orange-600 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando...
                </span>
              ) : (
                <>
                  Mostrando {valesAlmacen.length} vale
                  {valesAlmacen.length !== 1 ? "s" : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValesSalidaTable
              vales={valesAlmacen}
              onView={(vale) => {
                void handleViewVale(vale);
              }}
              onAnular={(vale) => {
                void handleAnularVale(vale);
              }}
              onExportPdf={(vale) => {
                void handleExportValePDF(vale);
              }}
              onExportExcel={(vale) => {
                void handleExportValeExcel(vale);
              }}
              loading={loading}
              isSearching={isSearching}
              searchTerm={searchTerm}
            />

            {/* Botón Cargar Más */}
            {hasMore && valesAlmacen.length > 0 && (
              <div className="mt-6 text-center border-t pt-6">
                <Button
                  onClick={() => void loadMore()}
                  disabled={loading}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando más vales...
                    </>
                  ) : (
                    <>
                      Cargar más ({vales.length} de {total})
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Mostrando {vales.length} de {total} vales totales
                </p>
              </div>
            )}

            {/* Mensaje cuando se cargaron todos */}
            {!hasMore && valesAlmacen.length > 0 && (
              <div className="mt-6 text-center border-t pt-6">
                <p className="text-sm text-gray-600">
                  ✓ Mostrando todos los {total} vales
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateValeSalidaDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        onSuccess={handleCreateSuccess}
        almacenId={almacenId}
        prefillSolicitudId={prefillSolicitudId}
      />

      <ValeSalidaDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        vale={selectedVale}
        onRegistrarDevolucion={handleOpenDevolucion}
      />

      <DevolucionValeDialog
        open={isDevolucionDialogOpen}
        onOpenChange={setIsDevolucionDialogOpen}
        vale={selectedVale}
        onSuccess={() => {
          void loadVales();
        }}
      />

      <AnularValeDialog
        open={isAnularDialogOpen}
        onOpenChange={(open) => {
          setIsAnularDialogOpen(open);
          if (!open) setValeToAnular(null);
        }}
        vale={valeToAnular}
        onConfirm={confirmAnular}
        isLoading={anularLoading}
      />

      <Toaster />
    </div>
  );
}
