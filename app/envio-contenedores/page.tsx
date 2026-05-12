"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Package,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Ship,
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
import { useEnviosContenedores } from "@/hooks/use-envios-contenedores";
import type { Material } from "@/lib/material-types";
import type { QuickMaterialData } from "@/components/feats/envios-contenedores/quick-material-create-dialog";
import { EnvioContenedorFormDialog } from "@/components/feats/envios-contenedores/envio-contenedor-form-dialog";
import { EnviosContenedoresTable } from "@/components/feats/envios-contenedores/envios-contenedores-table";
import { EnvioDocumentosPanel } from "@/components/feats/envios-contenedores/envio-documentos-panel";
import { Paperclip } from "lucide-react";
import type {
  ArchivoEnvioContenedor,
  EnvioContenedor,
  EnvioContenedorCreateData,
  EstadoEnvioContenedor,
  TipoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

// ─── page guard ──────────────────────────────────────────────────────────────

export default function EnvioContenedoresPage() {
  return (
    <RouteGuard requiredModule="envio-contenedores">
      <EnvioContenedoresContent />
    </RouteGuard>
  );
}

// ─── main content ────────────────────────────────────────────────────────────

function EnvioContenedoresContent() {
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
    envios,
    filteredEnvios,
    loading,
    creating,
    updating,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    tipoFilter,
    setTipoFilter,
    pagadoFilter,
    setPagadoFilter,
    loadEnvios,
    createEnvio,
    updateEnvio,
    deleteEnvio,
    clearError,
  } = useEnviosContenedores();

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<EnvioContenedor | null>(null);
  const [docEnvio,     setDocEnvio]     = useState<EnvioContenedor | null>(null);
  const [docArchivos,  setDocArchivos]  = useState<ArchivoEnvioContenedor[]>([]);

  // ── active filters count ──
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

  // ── handlers ──
  const handleCreate = async (data: EnvioContenedorCreateData) => {
    await createEnvio(data);
    toast({ title: "Envío registrado", description: "El envío fue creado correctamente." });
  };

  const handleEdit = async (data: EnvioContenedorCreateData) => {
    if (!editTarget) return;
    await updateEnvio(editTarget.id, data);
    toast({ title: "Envío actualizado", description: "Los cambios fueron guardados." });
    setEditTarget(null);
  };

  const handleOpenDocs = (envio: EnvioContenedor) => {
    setDocEnvio(envio);
    setDocArchivos(envio.archivos ?? []);
  };

  const handleCloseDocs = () => {
    setDocEnvio(null);
    setDocArchivos([]);
  };

  const handleCreateMaterial = async (data: QuickMaterialData): Promise<Material> => {
    // Resolver el producto_id por categoría; si no existe, crearla.
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
      producto_id: productoId,
    };

    toast({
      title: "Material creado",
      description: `${data.codigo} — ${data.descripcion}`,
    });

    return nuevo;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este envío? Esta acción no se puede deshacer.")) return;
    try {
      await deleteEnvio(id);
      toast({ title: "Envío eliminado", description: "El registro fue eliminado." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el envío.", variant: "destructive" });
    }
  };

  if (loading && envios.length === 0) {
    return <PageLoader moduleName="Envío de Contenedores" text="Cargando envíos..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">

      <ModuleHeader
        title="Envío de Contenedores"
        subtitle="Registro y seguimiento de contenedores y materiales"
        badge={{ text: "Logística", className: "bg-cyan-100 text-cyan-800" }}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadEnvios()}
              title="Recargar"
              aria-label="Recargar"
              className="touch-manipulation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => setCreateOpen(true)}
              aria-label="Nuevo envío"
              title="Nuevo envío"
              className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 touch-manipulation"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo envío</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4">

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Barra de filtros y búsqueda ── */}
        <Card className="border border-gray-200 shadow-none mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, material, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-3 text-sm bg-gray-50 border-gray-200"
                />
              </div>

              {/* Estado */}
              <Select
                value={estadoFilter}
                onValueChange={(v) => setEstadoFilter(v as "todos" | EstadoEnvioContenedor)}
              >
                <SelectTrigger className="h-8 w-36 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="arribado">Arribado</SelectItem>
                  <SelectItem value="recibido">Recibido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Tipo */}
              <Select
                value={tipoFilter}
                onValueChange={(v) => setTipoFilter(v as "todos" | TipoEnvioContenedor)}
              >
                <SelectTrigger className="h-8 w-36 text-sm bg-gray-50 border-gray-200">
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
                  <SelectItem value="otro">
                    <span className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-gray-500" /> Otro</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Pago */}
              <Select
                value={pagadoFilter}
                onValueChange={(v) => setPagadoFilter(v as "todos" | "pagado" | "pendiente")}
              >
                <SelectTrigger className="h-8 w-36 text-sm bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los pagos</SelectItem>
                  <SelectItem value="pagado">Pagados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>

              {/* Limpiar filtros */}
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

              {/* Contador resultados */}
              <span className="ml-auto text-xs text-gray-400 shrink-0">
                {filteredEnvios.length} de {envios.length} envío{envios.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabla ── */}
        <Card className="border border-gray-200 shadow-none mb-6">
          <CardContent className="p-0">
            <EnviosContenedoresTable
              envios={filteredEnvios}
              onDelete={handleDelete}
              onEdit={(envio) => setEditTarget(envio)}
              onDocs={handleOpenDocs}
            />
          </CardContent>
        </Card>
      </main>

      {/* ── Dialog crear ── */}
      <EnvioContenedorFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        materials={materials}
        isLoading={creating || loadingMaterials}
        categories={categories}
        onCreateMaterial={handleCreateMaterial}
      />

      {/* ── Dialog editar ── */}
      <EnvioContenedorFormDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSubmit={handleEdit}
        materials={materials}
        isLoading={updating || loadingMaterials}
        initialData={editTarget ?? undefined}
        categories={categories}
        onCreateMaterial={handleCreateMaterial}
      />

      {/* ── Dialog documentos ── */}
      <Dialog open={Boolean(docEnvio)} onOpenChange={(open) => { if (!open) handleCloseDocs(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-orange-100 shrink-0">
                <Paperclip className="h-4 w-4 text-orange-600" />
              </span>
              <div className="min-w-0">
                <span className="text-gray-900">Documentos adjuntos</span>
                {docEnvio && (
                  <p className="text-xs font-normal text-gray-400 truncate mt-0.5">{docEnvio.nombre}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {docEnvio && (
            <EnvioDocumentosPanel
              envioId={docEnvio.id}
              archivos={docArchivos}
              onArchivosChange={setDocArchivos}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
