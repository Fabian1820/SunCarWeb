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
import {
  Search,
  FileOutput,
  Plus,
  Copy,
  Check,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { SolicitudMaterialService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { useValesSalida } from "@/hooks/use-vales-salida";
import { ValesSalidaTable } from "@/components/feats/vales-salida/vales-salida-table";
import { CreateValeSalidaDialog } from "@/components/feats/vales-salida/create-vale-salida-dialog";
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog";
import type { SolicitudMaterial, ValeSalida } from "@/lib/api-types";

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
  const [prefillSolicitudCode, setPrefillSolicitudCode] = useState<
    string | null
  >(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<
    SolicitudMaterial[]
  >([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [copiedSolicitudId, setCopiedSolicitudId] = useState<string | null>(
    null,
  );

  const loadSolicitudesPendientes = useCallback(async () => {
    setLoadingPendientes(true);
    try {
      const data = await SolicitudMaterialService.getSolicitudes({
        almacen_id: almacenId,
        estado: "nueva",
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
    loadSolicitudesPendientes();
  }, [loadSolicitudesPendientes]);

  const valesAlmacen = useMemo(() => {
    return filteredVales.filter((vale) => {
      const solicitud = vale.solicitud_material || vale.solicitud;
      const solicitudAlmacenId = solicitud?.almacen?.id;
      if (!solicitudAlmacenId) return true;
      return solicitudAlmacenId === almacenId;
    });
  }, [filteredVales, almacenId]);

  if (loading && vales.length === 0) {
    return <PageLoader moduleName="Vales de Salida" text="Cargando vales..." />;
  }

  const handleCreateSuccess = () => {
    loadVales();
    loadSolicitudesPendientes();
    setPrefillSolicitudCode(null);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) setPrefillSolicitudCode(null);
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
      loadSolicitudesPendientes();
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
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const getSolicitudCode = (solicitud: SolicitudMaterial) =>
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  const handleCopyCodigo = async (solicitud: SolicitudMaterial) => {
    const codigo = getSolicitudCode(solicitud);
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedSolicitudId(solicitud.id);
      toast({
        title: "Copiado",
        description: `Codigo ${codigo} copiado al portapapeles`,
      });
      setTimeout(() => {
        setCopiedSolicitudId((current) =>
          current === solicitud.id ? null : current,
        );
      }, 1800);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el codigo al portapapeles",
        variant: "destructive",
      });
      console.error("Error copying solicitud code:", error);
    }
  };

  const handleCreateFromSolicitud = (solicitud: SolicitudMaterial) => {
    const codigo = getSolicitudCode(solicitud);
    setPrefillSolicitudCode(codigo);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Vales de Salida"
        subtitle="Gestiona los vales de salida de materiales"
        badge={{
          text: "Almacenes",
          className: "bg-orange-100 text-orange-800",
        }}
        className="bg-white shadow-sm border-b border-orange-100"
        backButton={{
          href: `/almacenes-suncar/${almacenId}`,
          label: "Volver al Almacen",
        }}
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Nuevo vale"
            title="Nuevo vale"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Vale</span>
            <span className="sr-only">Nuevo vale</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              Solicitudes Pendientes (Nuevas)
            </CardTitle>
            <CardDescription>
              Copia el codigo y pegalo en el buscador del dialogo para crear el
              vale.
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
                      const copied = copiedSolicitudId === solicitud.id;
                      return (
                        <tr
                          key={solicitud.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-2 px-2 font-mono font-medium text-amber-700">
                            {getSolicitudCode(solicitud)}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {solicitud.cliente?.nombre || "Sin cliente"}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {solicitud.materiales?.length || 0}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {formatDate(solicitud.fecha_creacion)}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleCopyCodigo(solicitud)}
                                title="Copiar codigo"
                              >
                                {copied ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copiar codigo
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={() =>
                                  handleCreateFromSolicitud(solicitud)
                                }
                                title="Crear vale desde esta solicitud"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Crear vale
                              </Button>
                            </div>
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
        prefillSolicitudCode={prefillSolicitudCode}
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
