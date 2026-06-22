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
import { Badge } from "@/components/shared/atom/badge";
import { useToast } from "@/hooks/use-toast";
import { useReservasVentas } from "@/hooks/use-reservas-ventas";
import { ReservasVentasTable } from "@/components/feats/reservas-ventas/reservas-ventas-table";
import { CreateReservaDialog } from "@/components/feats/reservas-ventas/create-reserva-dialog";
import { EditReservaVentaDialog } from "@/components/feats/reservas-ventas/edit-reserva-venta-dialog";
import { ReservaVentaDetailDialog } from "@/components/feats/reservas-ventas/reserva-venta-detail-dialog";
import type {
  Reserva,
  ReservaCreateData,
  ReservaEstado,
  ReservaOrigen,
  ReservaTipoEquipo,
  ReservaUpdateData,
} from "@/lib/api-types";

type OrigenTab = "todas" | ReservaOrigen;

const ORIGEN_TABS: { value: OrigenTab; label: string; color: string }[] = [
  { value: "todas", label: "Todas", color: "bg-gray-100 text-gray-700" },
  {
    value: "instaladora",
    label: "Instaladora",
    color: "bg-orange-100 text-orange-700",
  },
  { value: "ventas", label: "Ventas", color: "bg-indigo-100 text-indigo-700" },
];

export default function ReservasPage() {
  const { toast } = useToast();
  const {
    filteredReservas,
    loading,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    total,
    createReserva,
    updateReserva,
    cancelarReserva,
  } = useReservasVentas();

  const [origenTab, setOrigenTab] = useState<OrigenTab>("todas");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [reservaToEdit, setReservaToEdit] = useState<Reserva | null>(null);
  const [reservaToCancel, setReservaToCancel] = useState<Reserva | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleOrigenTab = (tab: OrigenTab) => {
    setOrigenTab(tab);
    setFilters({ origen: tab === "todas" ? undefined : tab });
  };

  if (loading && filteredReservas.length === 0) {
    return <PageLoader moduleName="Reservas" text="Cargando reservas..." />;
  }

  const handleCreate = async (data: ReservaCreateData) => {
    setCreateLoading(true);
    try {
      await createReserva(data);
      toast({ title: "Éxito", description: "Reserva creada correctamente" });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo crear la reserva",
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

  const handleEditClick = (reserva: Reserva) => {
    setReservaToEdit(reserva);
    setIsEditDialogOpen(true);
  };

  const handleEdit = async (id: string, data: ReservaUpdateData) => {
    setEditLoading(true);
    try {
      await updateReserva(id, data);
      toast({ title: "Éxito", description: "Reserva actualizada correctamente" });
      setIsEditDialogOpen(false);
      setReservaToEdit(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la reserva",
        variant: "destructive",
      });
      throw error;
    } finally {
      setEditLoading(false);
    }
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
      toast({ title: "Éxito", description: "Reserva cancelada correctamente" });
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

  const activeTab = ORIGEN_TABS.find((t) => t.value === origenTab)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <ModuleHeader
        title="Reservas"
        subtitle="Gestiona reservas de materiales para instaladora y ventas"
        badge={{ text: "Almacén", className: "bg-indigo-100 text-indigo-800" }}
        className="bg-white shadow-sm border-b border-indigo-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Nueva reserva"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Reserva</span>
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
                    Reservas de materiales
                  </CardTitle>
                  <CardDescription className="text-indigo-600">
                    {total > 0
                      ? `${total} reserva${total !== 1 ? "s" : ""} en total`
                      : "Sin reservas registradas"}
                  </CardDescription>
                </div>
              </div>

              {/* Origen tabs */}
              <div className="flex gap-2 pt-2 flex-wrap">
                {ORIGEN_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleOrigenTab(tab.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      origenTab === tab.value
                        ? `${tab.color} border-transparent shadow-sm`
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {origenTab !== "todas" && (
                  <Badge className={`ml-1 self-center ${activeTab.color}`}>
                    {activeTab.label}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Filters */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
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
                          estado: v === "todos" ? undefined : (v as ReservaEstado),
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="sm:w-56 space-y-1">
                    <Label className="text-xs text-gray-500">Tipo de equipo</Label>
                    <Select
                      value={filters.tipo_equipo ?? "todos"}
                      onValueChange={(v) =>
                        setFilters({
                          tipo_equipo:
                            v === "todos" ? undefined : (v as ReservaTipoEquipo),
                          // Limpiar potencia si pasa a "todos" (no aplica sin tipo)
                          ...(v === "todos"
                            ? { potencia_min_kw: undefined, potencia_max_kw: undefined }
                            : {}),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="bateria">Baterías</SelectItem>
                        <SelectItem value="inversor">Inversores</SelectItem>
                        <SelectItem value="panel">Paneles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:w-40 space-y-1">
                    <Label className="text-xs text-gray-500">
                      Potencia mín. (kW)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={filters.potencia_min_kw ?? ""}
                      disabled={
                        !filters.tipo_equipo || filters.tipo_equipo === "panel"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setFilters({
                          potencia_min_kw:
                            v === "" ? undefined : Number(v),
                        });
                      }}
                    />
                  </div>
                  <div className="sm:w-40 space-y-1">
                    <Label className="text-xs text-gray-500">
                      Potencia máx. (kW)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="∞"
                      value={filters.potencia_max_kw ?? ""}
                      disabled={
                        !filters.tipo_equipo || filters.tipo_equipo === "panel"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setFilters({
                          potencia_max_kw:
                            v === "" ? undefined : Number(v),
                        });
                      }}
                    />
                  </div>
                  {(filters.tipo_equipo ||
                    filters.potencia_min_kw != null ||
                    filters.potencia_max_kw != null) && (
                    <div className="self-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFilters({
                            tipo_equipo: undefined,
                            potencia_min_kw: undefined,
                            potencia_max_kw: undefined,
                          })
                        }
                      >
                        Limpiar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <ReservasVentasTable
                reservas={filteredReservas}
                onView={handleView}
                onEdit={handleEditClick}
                onCancelar={handleCancelarClick}
              />

              {loading && filteredReservas.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Actualizando...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateReservaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createLoading}
        defaultOrigen={origenTab === "todas" ? "ventas" : origenTab}
      />

      <EditReservaVentaDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reserva={reservaToEdit}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

      <ReservaVentaDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        reserva={selectedReserva}
      />

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
