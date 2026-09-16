"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { useToast } from "@/hooks/use-toast";
import { PersonaCategoriaService } from "@/lib/api-services";
import { CATEGORIAS_CONTABILIDAD } from "@/lib/api-types";
import type { PersonaCategoria, PersonaCategoriaUpsertRequest } from "@/lib/api-types";
import { PersonaCategoriaForm } from "./persona-categoria-form";

const LABEL_POR_CATEGORIA = Object.fromEntries(
  CATEGORIAS_CONTABILIDAD.map((c) => [c.value, c.label]),
);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function PersonaCategoriaAdmin() {
  const [personas, setPersonas] = useState<PersonaCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PersonaCategoria | null>(null);
  const [deleting, setDeleting] = useState<PersonaCategoria | null>(null);
  const { toast } = useToast();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PersonaCategoriaService.getAll();
      setPersonas(data);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar personas y categorías",
        description: getErrorMessage(error, "No se pudo cargar el listado."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCreate = async (payload: PersonaCategoriaUpsertRequest) => {
    setSubmitting(true);
    try {
      await PersonaCategoriaService.create(payload);
      toast({ title: "Mapeo creado", description: "La persona se asignó a su categoría." });
      setIsCreateOpen(false);
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al crear",
        description: getErrorMessage(error, "No se pudo crear el mapeo."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload: PersonaCategoriaUpsertRequest) => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await PersonaCategoriaService.update(editing.id, payload);
      toast({ title: "Mapeo actualizado", description: "Los cambios se guardaron." });
      setEditing(null);
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar",
        description: getErrorMessage(error, "No se pudo actualizar el mapeo."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await PersonaCategoriaService.delete(deleting.id);
      toast({ title: "Mapeo eliminado" });
      setDeleting(null);
      await cargar();
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar",
        description: getErrorMessage(error, "No se pudo eliminar el mapeo."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-teal-600">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-700" />
          Personas y categorías ({personas.length})
        </CardTitle>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo mapeo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600" />
          </div>
        ) : personas.length === 0 ? (
          <p className="py-10 text-center text-gray-600">Aún no hay personas configuradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3">Nombre</th>
                  <th className="text-left py-2 px-3">CI</th>
                  <th className="text-left py-2 px-3">Categoría</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-right py-2 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personas.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-teal-50/40">
                    <td className="py-2 px-3 font-medium text-gray-900">{p.persona_nombre}</td>
                    <td className="py-2 px-3 text-gray-600">{p.persona_ci || "—"}</td>
                    <td className="py-2 px-3">{LABEL_POR_CATEGORIA[p.categoria] ?? p.categoria}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditing(p)}
                          aria-label={`Editar ${p.persona_nombre}`}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeleting(p)}
                          aria-label={`Eliminar ${p.persona_nombre}`}
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo mapeo persona → categoría</DialogTitle>
          </DialogHeader>
          <PersonaCategoriaForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={submitting}
            submitText="Crear"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar mapeo</DialogTitle>
          </DialogHeader>
          {editing ? (
            <PersonaCategoriaForm
              initialData={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              isSubmitting={submitting}
              submitText="Guardar cambios"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar mapeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              ¿Eliminar el mapeo de <strong>{deleting?.persona_nombre}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
