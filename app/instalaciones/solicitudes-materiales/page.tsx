"use client";

import { useState } from "react";
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
import { Search, Package, Plus } from "lucide-react";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { useSolicitudesMateriales } from "@/hooks/use-solicitudes-materiales";
import { SolicitudesMaterialesTable } from "@/components/feats/solicitudes-materiales/solicitudes-materiales-table";
import { CreateSolicitudMaterialDialog } from "@/components/feats/solicitudes-materiales/create-solicitud-material-dialog";
import { SolicitudMaterialDetailDialog } from "@/components/feats/solicitudes-materiales/solicitud-material-detail-dialog";
import { AnularSolicitudDialog } from "@/components/shared/molecule/anular-solicitud-dialog";
import type { SolicitudMaterial } from "@/lib/api-types";

export default function SolicitudesMaterialesPage() {
  const { toast } = useToast();
  const {
    filteredSolicitudes,
    loading,
    searchTerm,
    setSearchTerm,
    loadSolicitudes,
    anularSolicitud,
    reabrirSolicitud,
  } = useSolicitudesMateriales();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [solicitudToEdit, setSolicitudToEdit] =
    useState<SolicitudMaterial | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [solicitudDetalle, setSolicitudDetalle] =
    useState<SolicitudMaterial | null>(null);
  const [isAnularDialogOpen, setIsAnularDialogOpen] = useState(false);
  const [solicitudToAnular, setSolicitudToAnular] =
    useState<SolicitudMaterial | null>(null);
  const [anularLoading, setAnularLoading] = useState(false);

  if (loading && filteredSolicitudes.length === 0) {
    return (
      <PageLoader
        moduleName="Solicitudes de Materiales"
        text="Cargando solicitudes..."
      />
    );
  }

  const handleCreateSuccess = () => {
    toast({
      title: "Exito",
      description: "Solicitud de materiales creada correctamente",
    });
    void loadSolicitudes();
  };

  const handleEditSuccess = async () => {
    try {
      toast({
        title: "Exito",
        description: "Solicitud de materiales actualizada correctamente",
      });
      await loadSolicitudes();
      setSolicitudToEdit(null);
      setIsEditDialogOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la solicitud";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getSolicitudCodigo = (solicitud: SolicitudMaterial) =>
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  const handleEditSolicitud = (solicitud: SolicitudMaterial) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({
        title: "Accion no permitida",
        description: "Solo se puede editar una solicitud con estado nueva.",
        variant: "destructive",
      });
      return;
    }

    setSolicitudToEdit(solicitud);
    setIsEditDialogOpen(true);
  };

  const handleOpenAnularSolicitud = (solicitud: SolicitudMaterial) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({
        title: "Accion no permitida",
        description: "Solo se puede anular una solicitud con estado nueva.",
        variant: "destructive",
      });
      return;
    }

    setSolicitudToAnular(solicitud);
    setIsAnularDialogOpen(true);
  };

  const handleConfirmAnularSolicitud = async (motivo: string) => {
    if (!solicitudToAnular) return;

    setAnularLoading(true);
    try {
      const response = await anularSolicitud(solicitudToAnular.id, {
        motivo_anulacion: motivo,
      });
      toast({
        title: "Exito",
        description: `Solicitud ${getSolicitudCodigo(response)} anulada correctamente.`,
      });
      setIsAnularDialogOpen(false);
      setSolicitudToAnular(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo anular la solicitud",
        variant: "destructive",
      });
    } finally {
      setAnularLoading(false);
    }
  };

  const handleReabrirSolicitud = async (solicitud: SolicitudMaterial) => {
    if (solicitud.estado?.toLowerCase() !== "anulada") {
      toast({
        title: "Accion no permitida",
        description: "Solo se puede reabrir una solicitud anulada.",
        variant: "destructive",
      });
      return;
    }

    try {
      const nuevaSolicitud = await reabrirSolicitud(solicitud.id);
      toast({
        title: "Exito",
        description: `Se creo la nueva solicitud ${getSolicitudCodigo(nuevaSolicitud)} a partir de ${getSolicitudCodigo(solicitud)}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo reabrir la solicitud",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Solicitudes de Materiales"
        subtitle="Gestiona las solicitudes de materiales para operaciones"
        badge={{
          text: "Operaciones",
          className: "bg-purple-100 text-purple-800",
        }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Nueva solicitud"
            title="Nueva solicitud"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Solicitud</span>
            <span className="sr-only">Nueva solicitud</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-purple-600">
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
                    placeholder="Buscar por codigo, cliente, almacen, creador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-purple-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Solicitudes de Materiales
            </CardTitle>
            <CardDescription>
              Mostrando {filteredSolicitudes.length} solicitud
              {filteredSolicitudes.length !== 1 ? "es" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SolicitudesMaterialesTable
              solicitudes={filteredSolicitudes}
              onView={(s) => {
                setSolicitudDetalle(s);
                setIsDetailDialogOpen(true);
              }}
              onEdit={handleEditSolicitud}
              onAnular={handleOpenAnularSolicitud}
              onReabrir={(s) => {
                void handleReabrirSolicitud(s);
              }}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>

      <CreateSolicitudMaterialDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <CreateSolicitudMaterialDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSolicitudToEdit(null);
        }}
        onSuccess={handleEditSuccess}
        solicitud={solicitudToEdit}
      />

      <SolicitudMaterialDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        solicitud={solicitudDetalle}
      />

      <AnularSolicitudDialog
        open={isAnularDialogOpen}
        onOpenChange={(open) => {
          setIsAnularDialogOpen(open);
          if (!open) setSolicitudToAnular(null);
        }}
        solicitudCodigo={
          solicitudToAnular
            ? getSolicitudCodigo(solicitudToAnular)
            : null
        }
        solicitudTipo="material"
        onConfirm={handleConfirmAnularSolicitud}
        isLoading={anularLoading}
      />

      <Toaster />
    </div>
  );
}
