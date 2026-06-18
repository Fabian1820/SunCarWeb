"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import { RouteGuard } from "@/components/auth/route-guard";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { useSolicitudesEntradaAlmacen } from "@/hooks/use-solicitudes-entrada-almacen";
import { CompraService, InventarioService } from "@/lib/api-services";
import type { Compra } from "@/lib/types/feats/compras/compra-types";
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";
import type {
  EstadoSolicitudEntrada,
  OrigenSolicitudEntrada,
  SolicitudEntradaAlmacen,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";
import { CrearSolicitudEntradaDialog } from "@/components/feats/solicitudes-entrada-almacen/crear-solicitud-entrada-dialog";
import { SolicitudesEntradaTable } from "@/components/feats/solicitudes-entrada-almacen/solicitudes-entrada-table";
import { SolicitudEntradaDetailDialog } from "@/components/feats/solicitudes-entrada-almacen/solicitud-entrada-detail-dialog";

const ESTADOS_COMPRA_PERMITIDOS = new Set(["solicitado", "enviado", "arribado", "recibido_parcial"]);

export default function SolicitudesEntradaAlmacenPage() {
  return (
    <RouteGuard requiredModule="solicitudes-entrada-almacen">
      <SolicitudesEntradaAlmacenContent />
    </RouteGuard>
  );
}

function SolicitudesEntradaAlmacenContent() {
  const { toast } = useToast();

  const [compras, setCompras] = useState<Compra[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  const loadRefs = async () => {
    setRefsLoading(true);
    try {
      const [comprasData, almacenesData] = await Promise.all([
        CompraService.getCompras(),
        InventarioService.getAlmacenes(),
      ]);
      setCompras(comprasData);
      setAlmacenes(almacenesData);
    } finally {
      setRefsLoading(false);
    }
  };

  useEffect(() => {
    void loadRefs();
  }, []);

  const {
    solicitudes,
    filteredSolicitudes,
    loading,
    creating,
    resolving,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    almacenFilter,
    setAlmacenFilter,
    compraFilter,
    setCompraFilter,
    origenFilter,
    setOrigenFilter,
    loadSolicitudes,
    createSolicitud,
    updateSolicitud,
    aprobarSolicitud,
    denegarSolicitud,
    clearError,
  } = useSolicitudesEntradaAlmacen();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [compraSeleccionadaId, setCompraSeleccionadaId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [compraParaCrear, setCompraParaCrear] = useState<Compra | null>(null);
  const [viewTarget, setViewTarget] = useState<SolicitudEntradaAlmacen | null>(null);
  const [editTarget, setEditTarget] = useState<SolicitudEntradaAlmacen | null>(null);

  const compraNameById = useMemo(() => {
    const map: Record<string, string> = {};
    compras.forEach((c) => { map[c.id] = c.nombre; });
    return map;
  }, [compras]);

  const almacenNameById = useMemo(() => {
    const map: Record<string, string> = {};
    almacenes.forEach((a) => { map[a.id] = a.nombre; });
    return map;
  }, [almacenes]);

  const comprasParaSolicitar = useMemo(
    () => compras.filter((c) => ESTADOS_COMPRA_PERMITIDOS.has(c.estado)),
    [compras],
  );

  const activeFilters = [
    estadoFilter !== "todos",
    almacenFilter !== "todos",
    compraFilter !== "todos",
    origenFilter !== "todos",
    searchTerm.trim() !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setEstadoFilter("todos");
    setAlmacenFilter("todos");
    setCompraFilter("todos");
    setOrigenFilter("todos");
  };

  const handleAbrirSelector = () => {
    setCompraSeleccionadaId("");
    setSelectorOpen(true);
  };

  const handleConfirmarCompra = () => {
    const compra = comprasParaSolicitar.find((c) => c.id === compraSeleccionadaId);
    if (!compra) return;
    setCompraParaCrear(compra);
    setSelectorOpen(false);
    setCreateOpen(true);
  };

  const handleCreate = async (data: Parameters<typeof createSolicitud>[0]) => {
    await createSolicitud(data);
    toast({ title: "Solicitud creada", description: "La solicitud quedó en estado pendiente." });
  };

  const handleUpdate = async (id: string, data: Parameters<typeof updateSolicitud>[1]) => {
    await updateSolicitud(id, data);
    toast({ title: "Solicitud actualizada", description: "Los cambios fueron guardados." });
  };

  const compraDeEdicion = useMemo(() => {
    if (!editTarget) return null;
    return compras.find((c) => c.id === editTarget.compra_id) ?? null;
  }, [editTarget, compras]);

  const handleAprobar = async (id: string, payload: Parameters<typeof aprobarSolicitud>[1]) => {
    await aprobarSolicitud(id, payload);
    toast({ title: "Solicitud aprobada", description: "Se generaron los movimientos de entrada y el kardex." });
    // Refrescar compras para reflejar nuevo cantidad_entrada_aprobada y estado
    void CompraService.getCompras().then(setCompras);
  };

  const handleDenegar = async (id: string, payload: Parameters<typeof denegarSolicitud>[1]) => {
    await denegarSolicitud(id, payload);
    toast({ title: "Solicitud denegada", description: "La solicitud fue marcada como denegada." });
  };

  if ((loading || refsLoading) && solicitudes.length === 0) {
    return <PageLoader moduleName="Solicitudes de Entrada" text="Cargando solicitudes..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ModuleHeader
        title="Solicitudes de Entrada"
        subtitle="Recepción de materiales de compra al almacén con asignación por sector"
        badge={{ text: "Almacén", className: "bg-blue-100 text-blue-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { void loadSolicitudes(); void loadRefs(); }}
              title="Recargar"
              aria-label="Recargar"
              className="touch-manipulation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleAbrirSelector}
              aria-label="Nueva solicitud"
              title="Nueva solicitud"
              className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 touch-manipulation"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva solicitud</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4">
        {error && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Card className="border border-gray-200 shadow-none mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por ID, compra, almacén, material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-3 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <Select
                value={estadoFilter}
                onValueChange={(v) => setEstadoFilter(v as "todos" | EstadoSolicitudEntrada)}
              >
                <SelectTrigger className="h-8 w-36 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="denegada">Denegada</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={origenFilter}
                onValueChange={(v) => setOrigenFilter(v as "todos" | OrigenSolicitudEntrada)}
              >
                <SelectTrigger className="h-8 w-40 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los orígenes</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="consignacion">Consignación</SelectItem>
                </SelectContent>
              </Select>

              <Select value={almacenFilter} onValueChange={setAlmacenFilter}>
                <SelectTrigger className="h-8 w-44 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los almacenes</SelectItem>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={compraFilter} onValueChange={setCompraFilter}>
                <SelectTrigger className="h-8 w-44 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Compra" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="todos">Todas las compras</SelectItem>
                  {compras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 gap-1.5 text-gray-500 hover:text-gray-700 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar ({activeFilters})
                </Button>
              )}

              <span className="ml-auto text-xs text-gray-400 shrink-0">
                {filteredSolicitudes.length} de {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-none mb-6">
          <CardContent className="p-0">
            <SolicitudesEntradaTable
              solicitudes={filteredSolicitudes}
              compraNameById={compraNameById}
              almacenNameById={almacenNameById}
              onView={(s) => setViewTarget(s)}
            />
          </CardContent>
        </Card>
      </main>

      {/* Selector de compra */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Selecciona una compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Solo se muestran compras pendientes de recepción (solicitado, enviado, arribado o recibido parcial).
            </p>
            <Select value={compraSeleccionadaId} onValueChange={setCompraSeleccionadaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una compra..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {comprasParaSolicitar.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No hay compras con recepción pendiente
                  </div>
                ) : (
                  comprasParaSolicitar.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectorOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleConfirmarCompra}
                disabled={!compraSeleccionadaId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de creación */}
      <CrearSolicitudEntradaDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCompraParaCrear(null);
        }}
        compra={compraParaCrear}
        almacenes={almacenes}
        onSubmit={handleCreate}
        isLoading={creating}
      />

      {/* Modal de edición de solicitud pendiente */}
      <CrearSolicitudEntradaDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        compra={compraDeEdicion}
        almacenes={almacenes}
        solicitudExistente={editTarget}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Detalle */}
      <SolicitudEntradaDetailDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        solicitud={viewTarget}
        compraName={viewTarget ? compraNameById[viewTarget.compra_id] : undefined}
        almacenName={viewTarget ? almacenNameById[viewTarget.almacen_id] : undefined}
        onAprobar={handleAprobar}
        onDenegar={handleDenegar}
        onEdit={(s) => setEditTarget(s)}
        isResolving={resolving}
      />

      <Toaster />
    </div>
  );
}
