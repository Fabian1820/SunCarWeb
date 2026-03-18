"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
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
import { SedeForm } from "@/components/feats/sedes/sede-form";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import { SedeService } from "@/lib/api-services";
import type { Sede, SedeUpsertRequest } from "@/lib/api-types";

type EstadoFiltro = "todos" | "activos" | "inactivos";

export default function SedesPage() {
  return (
    <RouteGuard requiredModule="sedes">
      <SedesPageContent />
    </RouteGuard>
  );
}

function SedesPageContent() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [deletingSede, setDeletingSede] = useState<Sede | null>(null);
  const { toast } = useToast();

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadSedes = useCallback(async () => {
    setLoading(true);
    try {
      const activo =
        estadoFiltro === "todos" ? undefined : estadoFiltro === "activos";
      const data = await SedeService.getSedes(activo);
      setSedes(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar sedes",
        description: getErrorMessage(error, "No se pudieron cargar las sedes."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, toast]);

  useEffect(() => {
    loadSedes();
  }, [loadSedes]);

  const filteredSedes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sedes;
    return sedes.filter((sede) => {
      return (
        sede.nombre.toLowerCase().includes(term) ||
        (sede.provincia_nombre || "").toLowerCase().includes(term) ||
        (sede.provincia_codigo || "").toLowerCase().includes(term) ||
        sede.tipo.toLowerCase().includes(term)
      );
    });
  }, [search, sedes]);

  const handleCreate = async (payload: SedeUpsertRequest) => {
    setSubmitting(true);
    try {
      await SedeService.createSede(payload);
      toast({
        title: "Sede creada",
        description: "La sede se creó correctamente.",
      });
      setIsCreateOpen(false);
      await loadSedes();
    } catch (error: unknown) {
      toast({
        title: "Error al crear sede",
        description: getErrorMessage(error, "No se pudo crear la sede."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload: SedeUpsertRequest) => {
    if (!editingSede) return;
    setSubmitting(true);
    try {
      await SedeService.updateSede(editingSede.id, payload);
      toast({
        title: "Sede actualizada",
        description: "La sede se actualizó correctamente.",
      });
      setEditingSede(null);
      await loadSedes();
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar sede",
        description: getErrorMessage(error, "No se pudo actualizar la sede."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSede) return;
    setSubmitting(true);
    try {
      await SedeService.deleteSede(deletingSede.id);
      toast({
        title: "Sede eliminada",
        description: "La sede se eliminó correctamente.",
      });
      setDeletingSede(null);
      await loadSedes();
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar sede",
        description: getErrorMessage(error, "No se pudo eliminar la sede."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestionar Sedes"
        subtitle="CRUD completo de sedes y estructura territorial"
        badge={{ text: "Catálogo", className: "bg-blue-100 text-blue-800" }}
        actions={
          <Button
            size="icon"
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            aria-label="Nueva sede"
            title="Nueva sede"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Sede</span>
            <span className="sr-only">Nueva sede</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="mb-6 border-l-4 border-l-blue-600">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
              <div>
                <label htmlFor="buscar-sede" className="text-sm font-medium text-gray-700 block mb-2">
                  Buscar sede
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="buscar-sede"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre, tipo o provincia..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="filtro-estado-sede" className="text-sm font-medium text-gray-700 block mb-2">
                  Estado
                </label>
                <Select
                  value={estadoFiltro}
                  onValueChange={(value) => setEstadoFiltro(value as EstadoFiltro)}
                >
                  <SelectTrigger id="filtro-estado-sede">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activos">Activos</SelectItem>
                    <SelectItem value="inactivos">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-700" />
              Sedes ({filteredSedes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                <p className="text-sm text-gray-600 mt-3">Cargando sedes...</p>
              </div>
            ) : filteredSedes.length === 0 ? (
              <div className="py-10 text-center text-gray-600">
                No hay sedes para mostrar con los filtros actuales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3">Nombre</th>
                      <th className="text-left py-3 px-3">Tipo</th>
                      <th className="text-left py-3 px-3">Provincia</th>
                      <th className="text-left py-3 px-3">Estado</th>
                      <th className="text-right py-3 px-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSedes.map((sede) => (
                      <tr key={sede.id} className="border-b border-gray-100 hover:bg-blue-50/40">
                        <td className="py-3 px-3 font-medium text-gray-900">{sede.nombre}</td>
                        <td className="py-3 px-3 capitalize">{sede.tipo}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">
                          {sede.tipo === "provincial"
                            ? `${sede.provincia_nombre || "Sin nombre"} (${sede.provincia_codigo || "-"})`
                            : "Nacional"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              sede.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {sede.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingSede(sede)}
                              aria-label={`Editar ${sede.nombre}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => setDeletingSede(sede)}
                              aria-label={`Eliminar ${sede.nombre}`}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear sede</DialogTitle>
          </DialogHeader>
          <SedeForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={submitting}
            submitText="Crear sede"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingSede)} onOpenChange={(open) => !open && setEditingSede(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar sede</DialogTitle>
          </DialogHeader>
          {editingSede ? (
            <SedeForm
              initialData={{
                nombre: editingSede.nombre,
                tipo: editingSede.tipo === "provincial" ? "provincial" : "nacional",
                provincia_codigo: editingSede.provincia_codigo ?? "",
                provincia_nombre: editingSede.provincia_nombre ?? "",
                activo: editingSede.activo,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingSede(null)}
              isSubmitting={submitting}
              submitText="Guardar cambios"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingSede)} onOpenChange={(open) => !open && setDeletingSede(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar sede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              ¿Desea eliminar la sede <strong>{deletingSede?.nombre}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletingSede(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
