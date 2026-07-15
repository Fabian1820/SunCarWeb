"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Switch } from "@/components/shared/molecule/switch";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useComercialesDistribucion } from "@/hooks/use-comerciales-distribucion";
import { useEquiposComerciales } from "@/hooks/use-equipos-comerciales";
import { EquipoFormDialog } from "@/components/feats/distribucion-comerciales/equipo-form-dialog";
import { useToast } from "@/hooks/use-toast";
import type { EquipoComercial } from "@/lib/types/feats/distribucion-comerciales/distribucion-types";

function DistribucionComercialesContent() {
  const {
    comerciales,
    loading: loadingComerciales,
    toggleApoyoInstaladora,
    loadComerciales,
  } = useComercialesDistribucion();
  const {
    equipos,
    loading: loadingEquipos,
    createEquipo,
    updateEquipo,
    deleteEquipo,
  } = useEquiposComerciales();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState<EquipoComercial | null>(
    null,
  );
  const [equipoAEliminar, setEquipoAEliminar] =
    useState<EquipoComercial | null>(null);

  const comercialesInstaladora = comerciales.filter(
    (c) => c.cargo === "Comercial Instaladora",
  );
  const comercialesVentas = comerciales.filter(
    (c) => c.cargo === "Comercial Ventas",
  );

  const handleToggleApoyo = async (ci: string, valor: boolean) => {
    const ok = await toggleApoyoInstaladora(ci, valor);
    if (!ok) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el apoyo a instaladora",
        variant: "destructive",
      });
    }
  };

  const handleSubmitEquipo = async (
    nombre: string,
    integrantes: string[],
  ): Promise<boolean> => {
    const ok = equipoEditando
      ? await updateEquipo(equipoEditando.id, nombre, integrantes)
      : await createEquipo(nombre, integrantes);
    if (ok) {
      toast({
        title: "Éxito",
        description: equipoEditando
          ? "Equipo actualizado correctamente"
          : "Equipo creado correctamente",
      });
      await loadComerciales();
    } else {
      toast({
        title: "Error",
        description: equipoEditando
          ? "No se pudo actualizar el equipo"
          : "No se pudo crear el equipo",
        variant: "destructive",
      });
    }
    return ok;
  };

  const handleConfirmDelete = async () => {
    if (!equipoAEliminar) return;
    const ok = await deleteEquipo(equipoAEliminar.id);
    if (ok) {
      toast({ title: "Éxito", description: "Equipo eliminado correctamente" });
      await loadComerciales();
    } else {
      toast({
        title: "Error",
        description: "No se pudo eliminar el equipo",
        variant: "destructive",
      });
    }
    setEquipoAEliminar(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Distribución de Comerciales"
        subtitle="Organizar comerciales de instaladora y de apoyo en equipos"
        badge={{ text: "Instaladora", className: "bg-emerald-100 text-emerald-800" }}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEquipoEditando(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo equipo
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8">
        {/* Equipos */}
        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipos</h2>
          {loadingEquipos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : equipos.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía no hay equipos creados.
            </p>
          ) : (
            <div className="space-y-3">
              {equipos.map((equipo) => (
                <div
                  key={equipo.id}
                  className="flex items-center justify-between border rounded-md px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{equipo.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {equipo.integrantes.length === 0
                        ? "Sin integrantes"
                        : equipo.integrantes.map((i) => i.nombre).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEquipoEditando(equipo);
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setEquipoAEliminar(equipo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Comerciales Instaladora */}
        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Comerciales Instaladora
          </h2>
          {loadingComerciales ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Equipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comercialesInstaladora.map((c) => (
                  <TableRow key={c.CI}>
                    <TableCell className="font-medium text-gray-900">
                      {c.nombre}
                    </TableCell>
                    <TableCell>
                      {c.equipo_nombre ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {c.equipo_nombre}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Sin equipo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Comerciales Ventas - apoyo */}
        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Comerciales de Ventas — apoyo a Instaladora
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Marca cuáles apoyan a instaladora para poder asignarles equipo.
          </p>
          {loadingComerciales ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Apoyo a instaladora</TableHead>
                  <TableHead>Equipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comercialesVentas.map((c) => (
                  <TableRow key={c.CI}>
                    <TableCell className="font-medium text-gray-900">
                      {c.nombre}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.es_apoyo_instaladora}
                        onCheckedChange={(checked) =>
                          handleToggleApoyo(c.CI, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {c.equipo_nombre ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {c.equipo_nombre}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {c.es_apoyo_instaladora ? "Sin equipo" : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </main>

      <EquipoFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        equipo={equipoEditando}
        comerciales={comerciales}
        isLoading={loadingEquipos}
        onSubmit={handleSubmitEquipo}
      />

      <ConfirmDeleteDialog
        open={!!equipoAEliminar}
        onOpenChange={(open) => !open && setEquipoAEliminar(null)}
        title="Eliminar equipo"
        message={`¿Estás seguro de que quieres eliminar el equipo "${equipoAEliminar?.nombre}"? Sus integrantes quedarán sin equipo.`}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar equipo"
      />
    </div>
  );
}

export default function DistribucionComercialesPage() {
  return (
    <RouteGuard requiredModule="distribucion-comerciales">
      <DistribucionComercialesContent />
    </RouteGuard>
  );
}
