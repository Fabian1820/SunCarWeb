"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Switch } from "@/components/shared/molecule/switch";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Plus, Pencil, Ban, RotateCcw, Loader2 } from "lucide-react";
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
    mostrarInactivos,
    setMostrarInactivos,
    createEquipo,
    updateEquipo,
    desactivarEquipo,
    activarEquipo,
    jefesGenerales,
    loadingJefesGenerales,
    setJefeGeneral,
  } = useEquiposComerciales();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [equipoEditando, setEquipoEditando] = useState<EquipoComercial | null>(
    null,
  );
  const [equipoADesactivar, setEquipoADesactivar] =
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
    jefeCi: string | null,
  ): Promise<boolean> => {
    const ok = equipoEditando
      ? await updateEquipo(equipoEditando.id, nombre, integrantes, jefeCi)
      : await createEquipo(nombre, integrantes, jefeCi);
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

  const handleConfirmDesactivar = async () => {
    if (!equipoADesactivar) return;
    const ok = await desactivarEquipo(equipoADesactivar.id);
    if (ok) {
      toast({ title: "Éxito", description: "Equipo desactivado correctamente" });
      await loadComerciales();
    } else {
      toast({
        title: "Error",
        description: "No se pudo desactivar el equipo",
        variant: "destructive",
      });
    }
    setEquipoADesactivar(null);
  };

  const handleReactivar = async (equipo: EquipoComercial) => {
    const ok = await activarEquipo(equipo.id);
    if (ok) {
      toast({ title: "Éxito", description: "Equipo reactivado correctamente" });
      await loadComerciales();
    } else {
      toast({
        title: "Error",
        description: "No se pudo reactivar el equipo",
        variant: "destructive",
      });
    }
  };

  const handleSetJefeGeneral = async (
    rol: "comercial_general" | "instaladora",
    ci: string,
  ) => {
    const ok = await setJefeGeneral(rol, ci === "ninguno" ? null : ci);
    if (!ok) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el jefe",
        variant: "destructive",
      });
    }
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

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jerarquia del Departamento Comercial */}
          <section className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Departamento Comercial
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Jerarquía del departamento. Los cambios se guardan al instante.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Jefe de Instaladora
                </label>
                <Select
                  value={jefesGenerales.jefe_instaladora?.CI || "ninguno"}
                  onValueChange={(value) =>
                    handleSetJefeGeneral("instaladora", value)
                  }
                  disabled={loadingJefesGenerales}
                >
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin asignar</SelectItem>
                    {comercialesInstaladora.map((c) => (
                      <SelectItem key={c.CI} value={c.CI}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Jefe Comercial General
                </label>
                <Select
                  value={jefesGenerales.jefe_comercial_general?.CI || "ninguno"}
                  onValueChange={(value) =>
                    handleSetJefeGeneral("comercial_general", value)
                  }
                  disabled={loadingJefesGenerales}
                >
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin asignar</SelectItem>
                    {comerciales.map((c) => (
                      <SelectItem key={c.CI} value={c.CI}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">
                Jefes de Equipo
              </label>
              {equipos.filter((e) => e.activo).length === 0 ? (
                <p className="text-sm text-gray-400">
                  Todavía no hay equipos creados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Jefe</TableHead>
                      <TableHead className="text-right">Integrantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipos
                      .filter((e) => e.activo)
                      .map((equipo) => (
                        <TableRow key={equipo.id}>
                          <TableCell className="font-medium text-gray-900">
                            {equipo.nombre}
                          </TableCell>
                          <TableCell>
                            {equipo.jefe ? (
                              equipo.jefe.nombre
                            ) : (
                              <span className="text-gray-400">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {equipo.integrantes.length}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>

          {/* Equipos */}
          <section className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Equipos</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <Checkbox
                  checked={mostrarInactivos}
                  onCheckedChange={(checked) =>
                    setMostrarInactivos(checked === true)
                  }
                />
                Ver equipos inactivos
              </label>
            </div>
            {loadingEquipos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : equipos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Todavía no hay equipos creados.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Jefe</TableHead>
                      <TableHead>Integrantes</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipos.map((equipo) => (
                      <TableRow
                        key={equipo.id}
                        className={!equipo.activo ? "opacity-60" : ""}
                      >
                        <TableCell className="font-medium text-gray-900 align-top">
                          <div className="flex items-center gap-2">
                            {equipo.nombre}
                            {!equipo.activo && (
                              <Badge className="bg-gray-200 text-gray-600 text-[10px]">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {equipo.jefe ? (
                            equipo.jefe.nombre
                          ) : (
                            <span className="text-gray-400">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {equipo.integrantes.length === 0 ? (
                            <span className="text-gray-400">
                              Sin integrantes
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {equipo.integrantes
                                .filter((i) => i.CI !== equipo.jefe?.CI)
                                .map((i) => (
                                  <span
                                    key={i.CI}
                                    className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                  >
                                    {i.nombre}
                                  </span>
                                ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <div className="flex justify-end gap-0.5">
                            {equipo.activo ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setEquipoEditando(equipo);
                                    setIsFormOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                                  onClick={() => setEquipoADesactivar(equipo)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800"
                                onClick={() => handleReactivar(equipo)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>

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
                      <span className="flex items-center gap-1.5">
                        {c.nombre}
                        {jefesGenerales.jefe_instaladora?.CI === c.CI && (
                          <Badge className="bg-gray-100 text-gray-600 text-[10px] font-medium">
                            Jefe de Instaladora
                          </Badge>
                        )}
                        {jefesGenerales.jefe_comercial_general?.CI === c.CI && (
                          <Badge className="bg-gray-100 text-gray-600 text-[10px] font-medium">
                            Jefe Comercial General
                          </Badge>
                        )}
                      </span>
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
                      <span className="flex items-center gap-1.5">
                        {c.nombre}
                        {jefesGenerales.jefe_comercial_general?.CI === c.CI && (
                          <Badge className="bg-gray-100 text-gray-600 text-[10px] font-medium">
                            Jefe Comercial General
                          </Badge>
                        )}
                      </span>
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
        open={!!equipoADesactivar}
        onOpenChange={(open) => !open && setEquipoADesactivar(null)}
        title="Desactivar equipo"
        message={`¿Estás seguro de que quieres desactivar el equipo "${equipoADesactivar?.nombre}"? Dejará de aparecer en la lista activa, pero puedes reactivarlo cuando quieras. Sus integrantes conservan su historial.`}
        onConfirm={handleConfirmDesactivar}
        confirmText="Desactivar equipo"
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
