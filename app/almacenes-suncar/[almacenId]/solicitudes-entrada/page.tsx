"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  PackagePlus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { PageLoader } from "@/components/shared/atom/page-loader";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { ModuleHeader } from "@/components/shared/organism/module-header";
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
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";
import type { Compra } from "@/lib/types/feats/compras/compra-types";
import type {
  EstadoSolicitudEntrada,
  SolicitudEntradaAlmacen,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";
import { SolicitudesEntradaTable } from "@/components/feats/solicitudes-entrada-almacen/solicitudes-entrada-table";
import { SolicitudEntradaDetailDialog } from "@/components/feats/solicitudes-entrada-almacen/solicitud-entrada-detail-dialog";

export default function SolicitudesEntradaPorAlmacenPage() {
  const params = useParams();
  const almacenId = params.almacenId as string;

  const { toast } = useToast();

  const [almacen, setAlmacen] = useState<Almacen | null>(null);
  const [refsLoading, setRefsLoading] = useState(true);
  const [compras, setCompras] = useState<Compra[]>([]);

  useEffect(() => {
    let cancelled = false;
    setRefsLoading(true);
    Promise.all([InventarioService.getAlmacenes(), CompraService.getCompras()])
      .then(([almacenesData, comprasData]) => {
        if (cancelled) return;
        const found = almacenesData.find((a) => a.id === almacenId) ?? null;
        setAlmacen(found);
        setCompras(comprasData);
      })
      .finally(() => { if (!cancelled) setRefsLoading(false); });
    return () => { cancelled = true; };
  }, [almacenId]);

  const {
    solicitudes,
    filteredSolicitudes,
    loading,
    resolving,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    setAlmacenFilter,
    loadSolicitudes,
    aprobarSolicitud,
    denegarSolicitud,
    clearError,
  } = useSolicitudesEntradaAlmacen();

  // Forzar filtro por este almacén
  useEffect(() => {
    setAlmacenFilter(almacenId);
  }, [almacenId, setAlmacenFilter]);

  const [viewTarget, setViewTarget] = useState<SolicitudEntradaAlmacen | null>(null);

  const compraNameById = useMemo(() => {
    const map: Record<string, string> = {};
    compras.forEach((c) => { map[c.id] = c.nombre; });
    return map;
  }, [compras]);

  const almacenNameById = useMemo(() => {
    if (!almacen) return {};
    return { [almacen.id!]: almacen.nombre };
  }, [almacen]);

  const activeFilters = [
    estadoFilter !== "todos",
    searchTerm.trim() !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setEstadoFilter("todos");
  };

  const handleAprobar = async (id: string, payload: Parameters<typeof aprobarSolicitud>[1]) => {
    await aprobarSolicitud(id, payload);
    toast({ title: "Solicitud aprobada", description: "Se generaron los movimientos de entrada y el kardex." });
    void CompraService.getCompras().then(setCompras);
  };

  const handleDenegar = async (id: string, payload: Parameters<typeof denegarSolicitud>[1]) => {
    await denegarSolicitud(id, payload);
    toast({ title: "Solicitud denegada", description: "La solicitud fue marcada como denegada." });
  };

  if ((loading || refsLoading) && solicitudes.length === 0) {
    return <PageLoader moduleName="Solicitudes de Entrada" text="Cargando..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <ModuleHeader
        title="Solicitudes de Entrada"
        subtitle={almacen ? `Recepciones pendientes en ${almacen.nombre}` : "Recepciones pendientes en este almacén"}
        badge={{ text: "Almacén", className: "bg-indigo-100 text-indigo-800" }}
        backButton={{ href: `/almacenes-suncar/${almacenId}`, label: "Volver al almacén" }}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadSolicitudes()}
            title="Recargar"
            aria-label="Recargar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="relative md:col-span-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por compra, material, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 pr-3 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <Select
                value={estadoFilter}
                onValueChange={(v) => setEstadoFilter(v as "todos" | EstadoSolicitudEntrada)}
              >
                <SelectTrigger className="h-9 md:col-span-3 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="denegada">Denegada</SelectItem>
                </SelectContent>
              </Select>

              <div className="md:col-span-1 flex justify-end">
                {activeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2 gap-1 text-gray-500 hover:text-gray-700 text-xs"
                    title="Limpiar filtros"
                  >
                    <X className="h-3.5 w-3.5" />
                    {activeFilters}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <PackagePlus className="h-3.5 w-3.5 text-indigo-500" />
                <span>El almacenero aprueba o rechaza. Para crear nuevas solicitudes, ir a Compras.</span>
              </div>
              <span className="font-medium">
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

      <SolicitudEntradaDetailDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        solicitud={viewTarget}
        compraName={viewTarget ? compraNameById[viewTarget.compra_id] : undefined}
        almacenName={viewTarget ? almacenNameById[viewTarget.almacen_id] : undefined}
        onAprobar={handleAprobar}
        onDenegar={handleDenegar}
        isResolving={resolving}
      />

      <Toaster />
    </div>
  );
}
