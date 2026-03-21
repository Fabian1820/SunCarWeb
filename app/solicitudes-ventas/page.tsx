"use client";

import { useState } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
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
import { SolicitudesVentasTable } from "@/components/feats/solicitudes-ventas/solicitudes-ventas-table";
import { SolicitudVentaDetailDialog } from "@/components/feats/solicitudes-ventas/solicitud-venta-detail-dialog";
import { UpsertSolicitudVentaDialog } from "@/components/feats/solicitudes-ventas/upsert-solicitud-venta-dialog";
import { AnularSolicitudDialog } from "@/components/shared/molecule/anular-solicitud-dialog";
import type {
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
  SolicitudVentaSummary,
} from "@/lib/api-types";
import { SolicitudVentaService } from "@/lib/api-services";

export default function SolicitudesVentasPage() {
  const { toast } = useToast();
  const {
    filteredSolicitudes,
    loading,
    searchTerm,
    setSearchTerm,
    loadMore, // Nueva función para cargar más
    hasMore, // Flag para saber si hay más registros
    createSolicitud,
    updateSolicitud,
    anularSolicitud,
    reabrirSolicitud,
  } = useSolicitudesVentas();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAnularDialogOpen, setIsAnularDialogOpen] = useState(false);

  const [selectedSolicitud, setSelectedSolicitud] =
    useState<SolicitudVenta | null>(null);
  const [solicitudToAnular, setSolicitudToAnular] =
    useState<SolicitudVenta | null>(null);
  const [anularLoading, setAnularLoading] = useState(false);

  if (loading && filteredSolicitudes.length === 0) {
    return (
      <PageLoader
        moduleName="Solicitudes Ventas"
        text="Cargando solicitudes de ventas..."
      />
    );
  }

  const getSolicitudCodigo = (solicitud: SolicitudVenta) =>
    solicitud.codigo || solicitud.id.slice(-6).toUpperCase();

  const handleCreate = async (
    data: SolicitudVentaCreateData | SolicitudVentaUpdateData,
  ) => {
    const clienteVentaId = data.cliente_venta_id?.trim();
    if (!clienteVentaId) {
      throw new Error("Debe seleccionar un cliente venta");
    }
    if (!data.almacen_id?.trim()) {
      throw new Error("Debe seleccionar un almacen");
    }
    if (!data.materiales || data.materiales.length === 0) {
      throw new Error("Debe agregar al menos un material");
    }

    try {
      await createSolicitud({
        cliente_venta_id: clienteVentaId,
        almacen_id: data.almacen_id,
        materiales: data.materiales,
      });
      toast({
        title: "Exito",
        description: "Solicitud de venta creada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear la solicitud de venta",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEdit = async (data: SolicitudVentaUpdateData) => {
    if (!selectedSolicitud) return;
    const solicitudEditada = selectedSolicitud;

    if (solicitudEditada.estado?.toLowerCase() !== "nueva") {
      const error = new Error(
        "Solo se puede editar una solicitud de venta con estado nueva.",
      );
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    try {
      await updateSolicitud(solicitudEditada.id, data);
      toast({
        title: "Exito",
        description: "Solicitud de venta actualizada correctamente",
      });
      setSelectedSolicitud(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la solicitud",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEditSolicitud = async (solicitud: SolicitudVentaSummary) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({
        title: "Accion no permitida",
        description:
          "Solo se puede editar una solicitud de venta con estado nueva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const solicitudCompleta =
        await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!solicitudCompleta) {
        toast({
          title: "Error",
          description: "No se pudo cargar la solicitud",
          variant: "destructive",
        });
        return;
      }
      setSelectedSolicitud(solicitudCompleta);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error("Error loading solicitud for edit:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la solicitud",
        variant: "destructive",
      });
    }
  };

  const handleOpenAnularSolicitud = async (
    solicitud: SolicitudVentaSummary,
  ) => {
    if (solicitud.estado?.toLowerCase() !== "nueva") {
      toast({
        title: "Accion no permitida",
        description:
          "Solo se puede anular una solicitud de venta con estado nueva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const solicitudCompleta =
        await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!solicitudCompleta) {
        toast({
          title: "Error",
          description: "No se pudo cargar la solicitud",
          variant: "destructive",
        });
        return;
      }
      setSolicitudToAnular(solicitudCompleta);
      setIsAnularDialogOpen(true);
    } catch (error) {
      console.error("Error loading solicitud for anular:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la solicitud",
        variant: "destructive",
      });
    }
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
          error instanceof Error
            ? error.message
            : "No se pudo anular la solicitud de venta",
        variant: "destructive",
      });
    } finally {
      setAnularLoading(false);
    }
  };

  const handleReabrirSolicitud = async (solicitud: SolicitudVentaSummary) => {
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
        description: `Se creo la nueva solicitud ${getSolicitudCodigo(nuevaSolicitud)} a partir de ${solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo reabrir solicitud de venta",
        variant: "destructive",
      });
    }
  };

  const handleViewSolicitud = async (solicitud: SolicitudVentaSummary) => {
    try {
      const solicitudCompleta =
        await SolicitudVentaService.getSolicitudById(solicitud.id);
      if (!solicitudCompleta) {
        toast({
          title: "Error",
          description: "No se pudo cargar la solicitud",
          variant: "destructive",
        });
        return;
      }
      setSelectedSolicitud(solicitudCompleta);
      setIsDetailDialogOpen(true);
    } catch (error) {
      console.error("Error loading solicitud details:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar los detalles de la solicitud",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Solicitudes Ventas"
        subtitle="Crea y gestiona solicitudes de ventas con materiales vendibles"
        badge={{ text: "Ventas", className: "bg-indigo-100 text-indigo-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
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
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-indigo-600">
          <CardContent className="pt-6">
            <div>
              <Label
                htmlFor="search-solicitudes-ventas"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Buscar en resultados cargados
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-solicitudes-ventas"
                  placeholder="Buscar por codigo, cliente, almacen o trabajador..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-indigo-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
              Solicitudes de Ventas
            </CardTitle>
            <CardDescription>
              Mostrando {filteredSolicitudes.length} solicitud
              {filteredSolicitudes.length !== 1 ? "es" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SolicitudesVentasTable
              solicitudes={filteredSolicitudes}
              onView={(solicitud) => {
                void handleViewSolicitud(solicitud);
              }}
              onEdit={(solicitud) => {
                void handleEditSolicitud(solicitud);
              }}
              onAnular={(solicitud) => {
                void handleOpenAnularSolicitud(solicitud);
              }}
              onReabrir={(solicitud) => {
                void handleReabrirSolicitud(solicitud);
              }}
            />

            {/* Botón Cargar Más */}
            {hasMore && filteredSolicitudes.length > 0 && (
              <div className="mt-6 text-center border-t pt-6">
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
      </main>

      <UpsertSolicitudVentaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      <UpsertSolicitudVentaDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedSolicitud(null);
        }}
        onSubmit={handleEdit}
        solicitud={selectedSolicitud}
      />

      <SolicitudVentaDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) setSelectedSolicitud(null);
        }}
        solicitud={selectedSolicitud}
      />

      <AnularSolicitudDialog
        open={isAnularDialogOpen}
        onOpenChange={(open) => {
          setIsAnularDialogOpen(open);
          if (!open) setSolicitudToAnular(null);
        }}
        solicitudCodigo={
          solicitudToAnular ? getSolicitudCodigo(solicitudToAnular) : null
        }
        solicitudTipo="venta"
        onConfirm={handleConfirmAnularSolicitud}
        isLoading={anularLoading}
      />

      <Toaster />
    </div>
  );
}
