"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { DepartamentoForm } from "@/components/feats/departamentos/departamento-form";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";
import { DepartamentoService } from "@/lib/api-services";
import type { Departamento, DepartamentoUpsertRequest } from "@/lib/api-types";

type EstadoFiltro = "todos" | "activos" | "inactivos";

export default function DepartamentosPage() {
  return (
    <RouteGuard requiredModule="departamentos">
      <DepartamentosPageContent />
    </RouteGuard>
  );
}

function DepartamentosPageContent() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null);
  const [deletingDepartamento, setDeletingDepartamento] = useState<Departamento | null>(null);
  const { toast } = useToast();

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadDepartamentos = useCallback(async () => {
    setLoading(true);
    try {
      const activo =
        estadoFiltro === "todos" ? undefined : estadoFiltro === "activos";
      const data = await DepartamentoService.getDepartamentos(activo);
      setDepartamentos(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar departamentos",
        description: getErrorMessage(error, "No se pudieron cargar los departamentos."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, toast]);

  useEffect(() => {
    loadDepartamentos();
  }, [loadDepartamentos]);

  const filteredDepartamentos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departamentos;
    return departamentos.filter((item) =>
      item.nombre.toLowerCase().includes(term),
    );
  }, [departamentos, search]);

  const handleCreate = async (payload: DepartamentoUpsertRequest) => {
    setSubmitting(true);
    try {
      await DepartamentoService.createDepartamento(payload);
      toast({
        title: "Departamento creado",
        description: "El departamento se creó correctamente.",
      });
      setIsCreateOpen(false);
      await loadDepartamentos();
    } catch (error: unknown) {
      toast({
        title: "Error al crear departamento",
        description: getErrorMessage(error, "No se pudo crear el departamento."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload: DepartamentoUpsertRequest) => {
    if (!editingDepartamento) return;
    setSubmitting(true);
    try {
      await DepartamentoService.updateDepartamento(editingDepartamento.id, payload);
      toast({
        title: "Departamento actualizado",
        description: "El departamento se actualizó correctamente.",
      });
      setEditingDepartamento(null);
      await loadDepartamentos();
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar departamento",
        description: getErrorMessage(error, "No se pudo actualizar el departamento."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartamento) return;
    setSubmitting(true);
    try {
      await DepartamentoService.deleteDepartamento(deletingDepartamento.id);
      toast({
        title: "Departamento eliminado",
        description: "El departamento se eliminó correctamente.",
      });
      setDeletingDepartamento(null);
      await loadDepartamentos();
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar departamento",
        description: getErrorMessage(error, "No se pudo eliminar el departamento."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestionar Departamentos"
        subtitle="CRUD completo de departamentos organizacionales"
        badge={{ text: "Catálogo", className: "bg-teal-100 text-teal-800" }}
        actions={
          <Button
            size="icon"
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
            aria-label="Nuevo departamento"
            title="Nuevo departamento"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Departamento</span>
            <span className="sr-only">Nuevo departamento</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="mb-6 border-l-4 border-l-teal-600">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
              <div>
                <label htmlFor="buscar-departamento" className="text-sm font-medium text-gray-700 block mb-2">
                  Buscar departamento
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="buscar-departamento"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre del departamento..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="filtro-estado-departamento" className="text-sm font-medium text-gray-700 block mb-2">
                  Estado
                </label>
                <Select
                  value={estadoFiltro}
                  onValueChange={(value) => setEstadoFiltro(value as EstadoFiltro)}
                >
                  <SelectTrigger id="filtro-estado-departamento">
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

        <Card className="border-l-4 border-l-teal-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-teal-700" />
              Departamentos ({filteredDepartamentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600" />
                <p className="text-sm text-gray-600 mt-3">Cargando departamentos...</p>
              </div>
            ) : filteredDepartamentos.length === 0 ? (
              <div className="py-10 text-center text-gray-600">
                No hay departamentos para mostrar con los filtros actuales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3">Nombre</th>
                      <th className="text-left py-3 px-3">Estado</th>
                      <th className="text-right py-3 px-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartamentos.map((departamento) => (
                      <tr
                        key={departamento.id}
                        className="border-b border-gray-100 hover:bg-teal-50/40"
                      >
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {departamento.nombre}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              departamento.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {departamento.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingDepartamento(departamento)}
                              aria-label={`Editar ${departamento.nombre}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => setDeletingDepartamento(departamento)}
                              aria-label={`Eliminar ${departamento.nombre}`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear departamento</DialogTitle>
          </DialogHeader>
          <DepartamentoForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={submitting}
            submitText="Crear departamento"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingDepartamento)}
        onOpenChange={(open) => !open && setEditingDepartamento(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar departamento</DialogTitle>
          </DialogHeader>
          {editingDepartamento ? (
            <DepartamentoForm
              initialData={{
                nombre: editingDepartamento.nombre,
                activo: editingDepartamento.activo,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingDepartamento(null)}
              isSubmitting={submitting}
              submitText="Guardar cambios"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingDepartamento)}
        onOpenChange={(open) => !open && setDeletingDepartamento(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar departamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              ¿Desea eliminar el departamento{" "}
              <strong>{deletingDepartamento?.nombre}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletingDepartamento(null)}
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
