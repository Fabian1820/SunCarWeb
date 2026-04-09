"use client";

import { useState } from "react";
import { BookmarkCheck, Plus, Search } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useReservasVentas } from "@/hooks/use-reservas-ventas";
import { ReservasVentasTable } from "@/components/feats/reservas-ventas/reservas-ventas-table";
import { CreateReservaVentaDialog } from "@/components/feats/reservas-ventas/create-reserva-venta-dialog";
import { ReservaVentaDetailDialog } from "@/components/feats/reservas-ventas/reserva-venta-detail-dialog";
import type { Reserva, ReservaCreateData, ReservaEstado } from "@/lib/api-types";

export default function ReservasVentasPage() {
  const { toast } = useToast();
  const {
    filteredReservas,
    loading,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    total,
    loadReservas,
    createReserva,
    cancelarReserva,
  } = useReservasVentas();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [reservaToCancel, setReservaToCancel] = useState<Reserva | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  if (loading && filteredReservas.length === 0) {
    return (
      <PageLoader
        moduleName="Reservas Ventas"
        text="Cargando reservas..."
      />
    );
  }

  const handleCreate = async (data: ReservaCreateData) => {
    setCreateLoading(true);
    try {
      await createReserva(data);
      toast({
        title: "Éxito",
        description: "Reserva creada correctamente",
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear la reserva",
        variant: "destructive",
      });
      throw error;
    } finally {
      setCreateLoading(false);
    }
  };

  const handleView = (reserva: Reserva) => {
    setSelectedReserva(reserva);
    setIsDetailDialogOpen(true);
  };

  const handleCancelarClick = (reserva: Reserva) => {
    setReservaToCancel(reserva);
    setIsCancelConfirmOpen(true);
  };

  const handleCancelarConfirm = async () => {
    if (!reservaToCancel) return;
    setCancelLoading(true);
    try {
      await cancelarReserva(reservaToCancel.id);
      toast({
        title: "Éxito",
        description: "Reserva cancelada correctamente",
      });
      setIsCancelConfirmOpen(false);
      setReservaToCancel(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo cancelar la reserva",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const estadoOptions: { value: ReservaEstado | "todos"; label: string }[] = [
    { value: "todos", label: "Todos los estados" },
    { value: "activa", label: "Activa" },
    { value: "cancelada", label: "Cancelada" },
    { value: "expirada", label: "Expirada" },
    { value: "consumida", label: "Consumida" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <ModuleHeader
        title="Reservas de Ventas"
        subtitle="Gestiona las reservas de materiales para ventas"
        badge={{ text: "Ventas", className: "bg-indigo-100 text-indigo-800" }}
        className="bg-white shadow-sm border-b border-indigo-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Nueva reserva"
            title="Nueva reserva"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Reserva</span>
            <span className="sr-only">Nueva reserva</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="space-y-4">
          <Card className="bg-white shadow-sm border border-indigo-100">
            <CardHeader className="border-b border-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <BookmarkCheck className="h-5 w-5 text-indigo-600" />
                    Reservas de Ventas
                  </CardTitle>
                  <CardDescription className="text-indigo-600">
                    {total > 0
                      ? `${total} reserva${total !== 1 ? "s" : ""} en total`
                      : "Sin reservas registradas"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por ID, cliente, almacén..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="sm:w-48 space-y-1">
                  <Label className="text-xs text-gray-500">Estado</Label>
                  <Select
                    value={filters.estado ?? "todos"}
                    onValueChange={(v) =>
                      setFilters({
                        estado:
                          v === "todos" ? undefined : (v as ReservaEstado),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <ReservasVentasTable
                reservas={filteredReservas}
                onView={handleView}
                onCancelar={handleCancelarClick}
              />

              {/* Loading state while refreshing */}
              {loading && filteredReservas.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Actualizando...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Dialog */}
      <CreateReservaVentaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createLoading}
      />

      {/* Detail Dialog */}
      <ReservaVentaDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        reserva={selectedReserva}
      />

      {/* Cancel Confirm Dialog */}
      {isCancelConfirmOpen && reservaToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cancelar Reserva
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de que deseas cancelar la reserva{" "}
              <span className="font-mono font-medium text-indigo-700">
                {reservaToCancel.reserva_id ||
                  reservaToCancel.id.slice(-8).toUpperCase()}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCancelConfirmOpen(false);
                  setReservaToCancel(null);
                }}
                disabled={cancelLoading}
              >
                No, mantener
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelarConfirm}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Cancelando..." : "Sí, cancelar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
