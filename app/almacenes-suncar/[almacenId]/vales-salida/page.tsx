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
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Search, FileOutput, Plus, Loader2, ClipboardList } from "lucide-react";
import { ValeSalidaService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { useValesSalida } from "@/hooks/use-vales-salida";
import { ValesSalidaTable } from "@/components/feats/vales-salida/vales-salida-table";
import { CreateValeSalidaDialog } from "@/components/feats/vales-salida/create-vale-salida-dialog";
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog";
import type { ValeSalida, ValeSolicitudPendiente } from "@/lib/api-types";

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
    searchTerm,
    setSearchTerm,
    loadVales,
    deleteVale,
  } = useValesSalida();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedVale, setSelectedVale] = useState<ValeSalida | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [valeToDelete, setValeToDelete] = useState<ValeSalida | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [prefillSolicitudId, setPrefillSolicitudId] = useState<string | null>(
    null,
  );
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<
    ValeSolicitudPendiente[]
  >([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);

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
      console.error("Error loading pending solicitudes:", error);
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

  const handleDeleteVale = (vale: ValeSalida) => {
    setValeToDelete(vale);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!valeToDelete) return;

    setDeleteLoading(true);
    try {
      const success = await deleteVale(valeToDelete.id);
      if (!success) throw new Error("No se pudo eliminar el vale");
      toast({
        title: "Exito",
        description: "Vale de salida eliminado correctamente",
      });
      void loadSolicitudesPendientes();
      setValeToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el vale",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getSolicitudCode = (solicitud: ValeSolicitudPendiente) =>
    solicitud.codigo || solicitud.solicitud_id.slice(-6).toUpperCase();

  const getSolicitudCliente = (solicitud: ValeSolicitudPendiente) =>
    solicitud.cliente_venta?.nombre ||
    solicitud.cliente?.nombre ||
    "Sin cliente";

  const handleCreateFromSolicitud = (solicitud: ValeSolicitudPendiente) => {
    setPrefillSolicitudId(solicitud.solicitud_id);
    setIsCreateDialogOpen(true);
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
          label: "Volver al Almacen",
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              Solicitudes pendientes para vale
            </CardTitle>
            <CardDescription>
              Incluye solicitudes de materiales y solicitudes de ventas en
              estado nueva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendientes ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando solicitudes pendientes...
              </div>
            ) : solicitudesPendientes.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">
                No hay solicitudes nuevas pendientes para este almacen.
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
                        Codigo
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900">
                        Cliente
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900">
                        Materiales
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900">
                        Fecha
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900">
                        Accion
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesPendientes.map((solicitud) => {
                      const styles = getTipoStyles(solicitud.tipo_solicitud);
                      return (
                        <tr
                          key={`${solicitud.tipo_solicitud}-${solicitud.solicitud_id}`}
                          className={`border-b border-gray-100 ${styles.row}`}
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
                            {solicitud.materiales?.length || 0}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {formatDate(solicitud.fecha_creacion)}
                          </td>
                          <td className="py-2 px-2">
                            <Button
                              size="sm"
                              className={styles.button}
                              onClick={() =>
                                handleCreateFromSolicitud(solicitud)
                              }
                              title="Crear vale desde esta solicitud"
                              disabled={solicitud.puede_generar_vale === false}
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
        </Card>

        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-orange-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4">
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
                    placeholder="Buscar por codigo, solicitud, cliente o creador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-orange-600" />
              Vales de Salida
            </CardTitle>
            <CardDescription>
              Mostrando {valesAlmacen.length} vale
              {valesAlmacen.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValesSalidaTable
              vales={valesAlmacen}
              onView={(vale) => {
                setSelectedVale(vale);
                setIsDetailDialogOpen(true);
              }}
              onDelete={handleDeleteVale}
              loading={loading}
            />
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
      />

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Vale"
        message="Estas seguro de que quieres eliminar este vale de salida? Esta accion no se puede deshacer."
        onConfirm={confirmDelete}
        confirmText="Eliminar Vale"
        isLoading={deleteLoading}
      />

      <Toaster />
    </div>
  );
}
