"use client";

import { useState } from "react";
import { Plus, Search, Ship } from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/shared/molecule/card";
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
import { EnvioContenedorFormDialog } from "@/components/feats/envios-contenedores/envio-contenedor-form-dialog";
import { EnviosContenedoresTable } from "@/components/feats/envios-contenedores/envios-contenedores-table";
import {
  ENVIO_CONTENEDOR_ESTADO_LABELS,
  type EnvioContenedorCreateData,
  type EstadoEnvioContenedor,
} from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

export default function EnvioContenedoresPage() {
  return (
    <RouteGuard requiredModule="envio-contenedores">
      <EnvioContenedoresPageContent />
    </RouteGuard>
  );
}

function EnvioContenedoresPageContent() {
  const { toast } = useToast();
  const { materials, loading: loadingMaterials } = useMaterials();
  const {
    filteredEnvios,
    loading,
    creating,
    error,
    searchTerm,
    setSearchTerm,
    estadoFilter,
    setEstadoFilter,
    createEnvio,
    clearError,
  } = useEnviosContenedores();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (loading && filteredEnvios.length === 0) {
    return (
      <PageLoader
        moduleName="Envío de Contenedores"
        text="Cargando envíos de contenedores..."
      />
    );
  }

  const handleCreateEnvio = async (data: EnvioContenedorCreateData) => {
    try {
      await createEnvio(data);
      toast({
        title: "Éxito",
        description: "Envío de contenedor registrado correctamente.",
      });
    } catch (submitError) {
      toast({
        title: "Error",
        description:
          submitError instanceof Error
            ? submitError.message
            : "No se pudo registrar el envío.",
        variant: "destructive",
      });
      throw submitError;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Envío de Contenedores"
        subtitle="Registro y seguimiento de contenedores y materiales"
        badge={{ text: "Logística", className: "bg-cyan-100 text-cyan-800" }}
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 touch-manipulation"
            aria-label="Registrar envío"
            title="Registrar envío"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Envío</span>
            <span className="sr-only">Registrar envío</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-700"
                onClick={clearError}
              >
                Cerrar
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-l-4 border-l-cyan-600">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-envios">Buscar envío</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-envios"
                    placeholder="Buscar por nombre, descripción o material..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-estado">Estado</Label>
                <Select
                  value={estadoFilter}
                  onValueChange={(value) =>
                    setEstadoFilter(value as "todos" | EstadoEnvioContenedor)
                  }
                >
                  <SelectTrigger id="filter-estado">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="despachado">
                      {ENVIO_CONTENEDOR_ESTADO_LABELS.despachado}
                    </SelectItem>
                    <SelectItem value="recibido">
                      {ENVIO_CONTENEDOR_ESTADO_LABELS.recibido}
                    </SelectItem>
                    <SelectItem value="cancelado">
                      {ENVIO_CONTENEDOR_ESTADO_LABELS.cancelado}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-cyan-700" />
              Historial de envíos
            </CardTitle>
            <CardDescription>
              Se muestran nombre, descripción, fechas, estado y materiales por contenedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnviosContenedoresTable envios={filteredEnvios} />
          </CardContent>
        </Card>
      </main>

      <EnvioContenedorFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateEnvio}
        materials={materials}
        isLoading={creating || loadingMaterials}
      />

      <Toaster />
    </div>
  );
}
