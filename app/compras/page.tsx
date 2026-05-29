"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Ship,
  Store,
  Truck,
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
import { useMaterials } from "@/hooks/use-materials";
import { useCompras } from "@/hooks/use-compras";
import { useSolicitudesEntradaAlmacen } from "@/hooks/use-solicitudes-entrada-almacen";
import { InventarioService } from "@/lib/api-services";
import type { Material } from "@/lib/material-types";
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";
import type { QuickMaterialData } from "@/components/feats/compras/quick-material-create-dialog";
import { CompraFormDialog } from "@/components/feats/compras/compra-form-dialog";
import { ComprasTable } from "@/components/feats/compras/compras-table";
import { CompraDocumentosPanel } from "@/components/feats/compras/compra-documentos-panel";
import { CrearSolicitudEntradaDialog } from "@/components/feats/solicitudes-entrada-almacen/crear-solicitud-entrada-dialog";
import { CancelarCompraDialog } from "@/components/feats/compras/cancelar-compra-dialog";
import { Paperclip } from "lucide-react";
import type {
  ArchivoCompra,
  Compra,
  CompraCreateData,
  EstadoCompra,
  TipoCompra,
} from "@/lib/types/feats/compras/compra-types";

export default function ComprasPage() {
  return (
    <RouteGuard requiredModule="envio-contenedores">
      <ComprasContent />
    </RouteGuard>
  );
}

function ComprasContent() {
  const { toast } = useToast();
  const {
    materials,
    categories,
    catalogs,
    loading: loadingMaterials,
    createProduct,
    addMaterialToProduct,
  } = useMaterials();

  const {
    compras,
    filteredCompras,
    loading,
    creating,
    updating,
    cancelling,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    tipoFilter,
    setTipoFilter,
    pagadoFilter,
    setPagadoFilter,
    loadCompras,
    createCompra,
    updateCompra,
    deleteCompra,
    cancelarCompra,
    clearError,
  } = useCompras();

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Compra | null>(null);
  const [docCompra,    setDocCompra]    = useState<Compra | null>(null);
  const [docArchivos,  setDocArchivos]  = useState<ArchivoCompra[]>([]);
  const [solicitudCompra, setSolicitudCompra] = useState<Compra | null>(null);
  const [cancelarTarget, setCancelarTarget] = useState<Compra | null>(null);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);

  const { createSolicitud, creating: creatingSolicitud } = useSolicitudesEntradaAlmacen();

  useEffect(() => {
    void InventarioService.getAlmacenes().then(setAlmacenes);
  }, []);

  const handleSolicitarEntrada = (compra: Compra) => {
    setSolicitudCompra(compra);
  };

  const handleCrearSolicitud = async (data: Parameters<typeof createSolicitud>[0]) => {
    await createSolicitud(data);
    toast({ title: "Solicitud creada", description: "La solicitud quedó pendiente de aprobación." });
    // Refrescar compras para reflejar cualquier cambio derivado del backend
    void loadCompras();
  };

  const handleCancelarCompra = async (
    compraId: string,
    payload: Parameters<typeof cancelarCompra>[1],
  ) => {
    await cancelarCompra(compraId, payload);
    toast({
      title: "Compra cancelada",
      description: "La compra fue marcada como cancelada.",
    });
  };

  const activeFilters = [
    estadoFilter !== "todos",
    tipoFilter   !== "todos",
    pagadoFilter !== "todos",
    searchTerm.trim() !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setEstadoFilter("todos");
    setTipoFilter("todos");
    setPagadoFilter("todos");
  };

  const handleCreate = async (data: CompraCreateData) => {
    await createCompra(data);
    toast({ title: "Compra registrada", description: "La compra fue creada correctamente." });
  };

  const handleEdit = async (data: CompraCreateData) => {
    if (!editTarget) return;
    await updateCompra(editTarget.id, data);
    toast({ title: "Compra actualizada", description: "Los cambios fueron guardados." });
    setEditTarget(null);
  };

  const handleOpenDocs = (compra: Compra) => {
    setDocCompra(compra);
    setDocArchivos(compra.archivos ?? []);
  };

  const handleCloseDocs = () => {
    setDocCompra(null);
    setDocArchivos([]);
  };

  const handleCreateMaterial = async (data: QuickMaterialData): Promise<Material> => {
    let productoId =
      catalogs.find((c) => c.categoria === data.categoria)?.id;
    if (!productoId) {
      productoId = await createProduct(data.categoria, []);
    }

    const payload = {
      codigo: data.codigo,
      descripcion: data.descripcion,
      um: data.um,
      nombre: data.nombre,
      marca_id: data.marca_id,
      potenciaKW: data.potenciaKW,
      foto: data.foto,
      ficha_tecnica_url: data.ficha_tecnica_url,
    };

    await addMaterialToProduct(productoId, payload, data.categoria);

    const nuevo: Material = {
      id: `${productoId}_${data.codigo}`,
      codigo: data.codigo,
      categoria: data.categoria,
      descripcion: data.descripcion,
      um: data.um,
      nombre: data.nombre,
      marca_id: data.marca_id,
      potenciaKW: data.potenciaKW,
      foto: data.foto,
      ficha_tecnica_url: data.ficha_tecnica_url ?? null,
      producto_id: productoId,
    };

    toast({
      title: "Material creado",
      description: `${data.codigo} — ${data.descripcion}`,
    });

    return nuevo;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta compra? Esta acción no se puede deshacer.")) return;
    try {
      await deleteCompra(id);
      toast({ title: "Compra eliminada", description: "El registro fue eliminado." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar la compra.", variant: "destructive" });
    }
  };

  if (loading && compras.length === 0) {
    return <PageLoader moduleName="Compras" text="Cargando compras..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">

      <ModuleHeader
        title="Compras"
        subtitle="Registro y seguimiento de compras, contenedores y materiales"
        badge={{ text: "Logística", className: "bg-cyan-100 text-cyan-800" }}
        backHref="/compras-envios-costos"
        backLabel="Volver a Compras, Envíos y Costos"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadCompras()}
              title="Recargar"
              aria-label="Recargar"
              className="touch-manipulation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => setCreateOpen(true)}
              aria-label="Nueva compra"
              title="Nueva compra"
              className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 touch-manipulation"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nueva compra</span>
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
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="relative md:col-span-5 lg:col-span-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, material, código, proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 pr-3 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              <Select
                value={estadoFilter}
                onValueChange={(v) => setEstadoFilter(v as "todos" | EstadoCompra)}
              >
                <SelectTrigger className="h-9 md:col-span-3 lg:col-span-2 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="arribado">Arribado</SelectItem>
                  <SelectItem value="recibido_parcial">Recibido parcial</SelectItem>
                  <SelectItem value="recibido">Recibido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={tipoFilter}
                onValueChange={(v) => setTipoFilter(v as "todos" | TipoCompra)}
              >
                <SelectTrigger className="h-9 md:col-span-2 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="maritimo">
                    <span className="flex items-center gap-2"><Ship className="h-3.5 w-3.5 text-cyan-600" /> Marítimo</span>
                  </SelectItem>
                  <SelectItem value="aereo">
                    <span className="flex items-center gap-2"><Plane className="h-3.5 w-3.5 text-sky-600" /> Aéreo</span>
                  </SelectItem>
                  <SelectItem value="local">
                    <span className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-emerald-600" /> Local</span>
                  </SelectItem>
                  <SelectItem value="otro">
                    <span className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-gray-500" /> Otro</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={pagadoFilter}
                onValueChange={(v) => setPagadoFilter(v as "todos" | "pagado" | "pendiente")}
              >
                <SelectTrigger className="h-9 md:col-span-2 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los pagos</SelectItem>
                  <SelectItem value="pagado">Pagados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {activeFilters > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 px-2 gap-1.5 text-gray-500 hover:text-gray-700 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros ({activeFilters})
                </Button>
              ) : (
                <span className="text-gray-400">Sin filtros aplicados</span>
              )}
              <span className="ml-auto text-gray-500 font-medium">
                {filteredCompras.length} de {compras.length} compra{compras.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-none mb-6">
          <CardContent className="p-0">
            <ComprasTable
              compras={filteredCompras}
              onDelete={handleDelete}
              onEdit={(compra) => setEditTarget(compra)}
              onDocs={handleOpenDocs}
              onSolicitarEntrada={handleSolicitarEntrada}
              onCancelar={(compra) => setCancelarTarget(compra)}
            />
          </CardContent>
        </Card>
      </main>

      <CompraFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        materials={materials}
        isLoading={creating || loadingMaterials}
        categories={categories}
        onCreateMaterial={handleCreateMaterial}
      />

      <CompraFormDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSubmit={handleEdit}
        materials={materials}
        isLoading={updating || loadingMaterials}
        initialData={editTarget ?? undefined}
        categories={categories}
        onCreateMaterial={handleCreateMaterial}
      />

      <Dialog open={Boolean(docCompra)} onOpenChange={(open) => { if (!open) handleCloseDocs(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-orange-100 shrink-0">
                <Paperclip className="h-4 w-4 text-orange-600" />
              </span>
              <div className="min-w-0">
                <span className="text-gray-900">Documentos adjuntos</span>
                {docCompra && (
                  <p className="text-xs font-normal text-gray-400 truncate mt-0.5">{docCompra.nombre}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {docCompra && (
            <CompraDocumentosPanel
              compraId={docCompra.id}
              archivos={docArchivos}
              onArchivosChange={setDocArchivos}
            />
          )}
        </DialogContent>
      </Dialog>

      <CrearSolicitudEntradaDialog
        open={Boolean(solicitudCompra)}
        onOpenChange={(open) => { if (!open) setSolicitudCompra(null); }}
        compra={solicitudCompra}
        almacenes={almacenes}
        onSubmit={handleCrearSolicitud}
        isLoading={creatingSolicitud}
      />

      <CancelarCompraDialog
        open={Boolean(cancelarTarget)}
        onOpenChange={(open) => { if (!open) setCancelarTarget(null); }}
        compra={cancelarTarget}
        onSubmit={handleCancelarCompra}
        isLoading={cancelling}
      />

      <Toaster />
    </div>
  );
}
