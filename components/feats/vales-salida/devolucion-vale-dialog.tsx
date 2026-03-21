"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import { Textarea } from "@/components/shared/molecule/textarea";
import { useToast } from "@/hooks/use-toast";
import { DevolucionValeService, TrabajadorService } from "@/lib/api-services";
import type {
  DevolucionVale,
  DevolucionValeResumenMaterial,
  Trabajador,
  ValeSalida,
} from "@/lib/api-types";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

interface DevolucionValeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vale: ValeSalida | null;
  onSuccess?: () => void;
}

interface DevolucionMaterialFormRow {
  material_id: string;
  material_codigo?: string;
  material_descripcion?: string;
  um?: string;
  cantidad_salida: number;
  cantidad_devuelta: number;
  cantidad_disponible_devolver: number;
  cantidad: number;
}

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCantidad = (value: number): string =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatFecha = (value?: string): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getValeCodigo = (vale: ValeSalida | null) =>
  vale?.codigo || vale?.id?.slice(-6).toUpperCase() || "-";

const getMaterialNombre = (
  material:
    | DevolucionValeResumenMaterial
    | { material_descripcion?: string; material_codigo?: string; material_id?: string },
) =>
  material.material_descripcion || material.material_codigo || material.material_id || "Material";

const mapResumenToFormRows = (
  materiales: DevolucionValeResumenMaterial[],
): DevolucionMaterialFormRow[] =>
  materiales
    .map((material) => {
      const disponible = toSafeNumber(material.cantidad_disponible_devolver);
      return {
        material_id: material.material_id,
        material_codigo: material.material_codigo,
        material_descripcion: material.material_descripcion,
        um: material.um,
        cantidad_salida: toSafeNumber(material.cantidad_salida),
        cantidad_devuelta: toSafeNumber(material.cantidad_devuelta),
        cantidad_disponible_devolver: disponible,
        cantidad: disponible,
      };
    })
    .filter((material) => material.cantidad_disponible_devolver > 0);

export function DevolucionValeDialog({
  open,
  onOpenChange,
  vale,
  onSuccess,
}: DevolucionValeDialogProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<DevolucionVale[]>([]);
  const [resumenMateriales, setResumenMateriales] = useState<
    DevolucionValeResumenMaterial[]
  >([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadoresLoading, setTrabajadoresLoading] = useState(false);
  const [responsableResults, setResponsableResults] = useState<Trabajador[]>(
    [],
  );
  const [showResponsableDropdown, setShowResponsableDropdown] = useState(false);
  const [materialesForm, setMaterialesForm] = useState<DevolucionMaterialFormRow[]>([]);
  const [responsableDevolucion, setResponsableDevolucion] = useState("");
  const [comentario, setComentario] = useState("");

  const valeId = vale?.id || "";
  const valeBloqueado =
    !vale || vale.estado === "anulado" || vale.facturado === true;

  const resetMaterialesDesdeResumen = useCallback(
    (materiales: DevolucionValeResumenMaterial[]) => {
      setMaterialesForm(mapResumenToFormRows(materiales));
    },
    [],
  );

  const loadResumenEHistorial = useCallback(async () => {
    if (!open || !valeId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const [resumen, devoluciones] = await Promise.all([
        DevolucionValeService.getResumenPorVale(valeId),
        DevolucionValeService.getDevoluciones({
          vale_id: valeId,
          skip: 0,
          limit: 100,
        }),
      ]);

      const materiales = Array.isArray(resumen?.materiales)
        ? resumen.materiales
        : [];

      setResumenMateriales(materiales);
      setHistorial(Array.isArray(devoluciones) ? devoluciones : []);
      resetMaterialesDesdeResumen(materiales);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen de devoluciones";
      setLoadError(message);
      setResumenMateriales([]);
      setHistorial([]);
      setMaterialesForm([]);
    } finally {
      setLoading(false);
    }
  }, [open, resetMaterialesDesdeResumen, valeId]);

  useEffect(() => {
    if (!open) return;
    void loadResumenEHistorial();
  }, [open, loadResumenEHistorial]);

  useEffect(() => {
    if (!open) return;

    const loadTrabajadores = async () => {
      setTrabajadoresLoading(true);
      try {
        const trabajadoresData = await TrabajadorService.getAllTrabajadores();
        const trabajadoresDisponibles = (Array.isArray(trabajadoresData)
          ? trabajadoresData
          : []
        )
          .filter(
            (trabajador): trabajador is Trabajador =>
              Boolean(trabajador?.nombre?.trim()),
          )
          .map((trabajador) => ({
            ...trabajador,
            nombre: trabajador.nombre.trim(),
          }))
          .sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", {
              sensitivity: "base",
            }),
          );

        setTrabajadores(trabajadoresDisponibles);
      } catch (error) {
        setTrabajadores([]);
      } finally {
        setTrabajadoresLoading(false);
      }
    };

    void loadTrabajadores();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLoadError(null);
      setResponsableDevolucion("");
      setComentario("");
      setMaterialesForm([]);
      setResponsableResults([]);
      setShowResponsableDropdown(false);
      return;
    }

    if (valeId) {
      setComentario("");
    }
  }, [open, valeId]);

  useEffect(() => {
    const term = responsableDevolucion.trim().toLowerCase();
    if (!term) {
      setResponsableResults([]);
      setShowResponsableDropdown(false);
      return;
    }

    const handler = setTimeout(() => {
      const filtered = trabajadores
        .filter((trabajador) => {
          const nombre = trabajador.nombre?.toLowerCase() || "";
          const ci = trabajador.CI?.toLowerCase() || "";
          return nombre.includes(term) || ci.includes(term);
        })
        .slice(0, 15);
      setResponsableResults(filtered);
      setShowResponsableDropdown(filtered.length > 0);
    }, 200);

    return () => clearTimeout(handler);
  }, [responsableDevolucion, trabajadores]);

  const handleRemoveMaterial = (materialId: string) => {
    setMaterialesForm((prev) =>
      prev.filter((material) => material.material_id !== materialId),
    );
  };

  const handleCantidadChange = (materialId: string, value: string) => {
    const cantidad = toSafeNumber(value);
    setMaterialesForm((prev) =>
      prev.map((material) =>
        material.material_id === materialId ? { ...material, cantidad } : material,
      ),
    );
  };

  const handleSelectResponsable = (trabajador: Trabajador) => {
    setResponsableDevolucion(trabajador.nombre);
    setShowResponsableDropdown(false);
    setResponsableResults([]);
  };

  const handleClearResponsable = () => {
    setResponsableDevolucion("");
    setShowResponsableDropdown(false);
    setResponsableResults([]);
  };

  const materialesDisponiblesDevolver = useMemo(
    () =>
      resumenMateriales.filter(
        (material) => toSafeNumber(material.cantidad_disponible_devolver) > 0,
      ),
    [resumenMateriales],
  );

  const materialesValidos = useMemo(
    () =>
      materialesForm.filter(
        (material) =>
          material.material_id &&
          material.cantidad > 0 &&
          material.cantidad <= material.cantidad_disponible_devolver,
      ),
    [materialesForm],
  );

  const tieneCantidadInvalida = useMemo(
    () =>
      materialesForm.some(
        (material) =>
          material.cantidad <= 0 ||
          material.cantidad > material.cantidad_disponible_devolver,
      ),
    [materialesForm],
  );

  const canSubmit =
    !valeBloqueado &&
    !loading &&
    !submitting &&
    responsableDevolucion.trim().length > 0 &&
    materialesForm.length > 0 &&
    !tieneCantidadInvalida;

  const handleSubmit = async () => {
    if (!valeId || valeBloqueado || submitting) return;

    if (materialesForm.length === 0) {
      toast({
        title: "Seleccion requerida",
        description: "Debe seleccionar al menos un material para devolver.",
        variant: "destructive",
      });
      return;
    }

    if (materialesValidos.length !== materialesForm.length) {
      toast({
        title: "Cantidades invalidas",
        description:
          "Cada cantidad devuelta debe ser mayor que 0 y no puede exceder lo disponible.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const nuevaDevolucion = await DevolucionValeService.createDevolucion({
        vale_id: valeId,
        responsable_devolucion: responsableDevolucion.trim(),
        comentario: comentario.trim() || undefined,
        materiales: materialesValidos.map((material) => ({
          material_id: material.material_id,
          cantidad: material.cantidad,
        })),
      });

      toast({
        title: "Devolucion creada",
        description: `Se registro la devolucion ${nuevaDevolucion.id || ""}`.trim(),
      });

      setComentario("");
      await loadResumenEHistorial();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la devolucion";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resumenSinDisponibles = materialesDisponiblesDevolver.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-blue-600" />
            Devoluciones de Vale
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs"
            >
              {getValeCodigo(vale)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Consulta el resumen por material, crea nuevas devoluciones y revisa el
            historial del vale seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {valeBloqueado ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              {vale?.estado === "anulado"
                ? "No se puede crear devoluciones para un vale anulado."
                : "No se puede crear devoluciones para un vale ya facturado."}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando resumen e historial de devoluciones...
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-700">{loadError}</p>
              <Button
                variant="outline"
                onClick={() => void loadResumenEHistorial()}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Resumen por material
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadResumenEHistorial()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar
                  </Button>
                </div>
                {resumenMateriales.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Este vale no tiene materiales para devolucion.
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Material
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">
                            Salida
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">
                            Devuelta
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">
                            Disponible
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenMateriales.map((material) => {
                          const disponible = toSafeNumber(
                            material.cantidad_disponible_devolver,
                          );
                          return (
                            <tr
                              key={material.material_id}
                              className="border-b last:border-b-0"
                            >
                              <td className="py-2 px-3">
                                <p className="font-medium text-gray-900">
                                  {getMaterialNombre(material)}
                                </p>
                                {material.um ? (
                                  <p className="text-xs text-gray-500">
                                    UM: {material.um}
                                  </p>
                                ) : null}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatCantidad(toSafeNumber(material.cantidad_salida))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {formatCantidad(toSafeNumber(material.cantidad_devuelta))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span
                                  className={
                                    disponible > 0
                                      ? "font-semibold text-emerald-700"
                                      : "text-gray-500"
                                  }
                                >
                                  {formatCantidad(disponible)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Crear devolucion
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resetMaterialesDesdeResumen(resumenMateriales)}
                    disabled={submitting || resumenSinDisponibles}
                  >
                    Reiniciar seleccion
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="responsable-devolucion">
                      Responsable de devolucion{" "}
                      <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="responsable-devolucion"
                        placeholder="Buscar trabajador por nombre o CI..."
                        value={responsableDevolucion}
                        onChange={(event) =>
                          setResponsableDevolucion(event.target.value)
                        }
                        onFocus={() => {
                          if (responsableResults.length > 0) {
                            setShowResponsableDropdown(true);
                          }
                        }}
                        disabled={submitting || valeBloqueado}
                        className="pl-10 pr-10"
                      />
                      {trabajadoresLoading ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      ) : null}
                      {!trabajadoresLoading && responsableDevolucion ? (
                        <button
                          type="button"
                          onClick={handleClearResponsable}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                          disabled={submitting || valeBloqueado}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                      {showResponsableDropdown && responsableResults.length > 0 ? (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {responsableResults.map((trabajador) => (
                            <button
                              key={`${trabajador.id}-${trabajador.CI}`}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                              onClick={() => handleSelectResponsable(trabajador)}
                            >
                              <span className="font-medium">
                                {trabajador.nombre}
                              </span>
                              {trabajador.CI ? (
                                <span className="ml-2 text-gray-500">
                                  CI {trabajador.CI}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {!trabajadoresLoading && trabajadores.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No hay trabajadores disponibles.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleClearResponsable}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      disabled={submitting || valeBloqueado}
                    >
                      Limpiar responsable
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comentario-devolucion">Comentario</Label>
                    <Textarea
                      id="comentario-devolucion"
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      placeholder="Opcional"
                      disabled={submitting || valeBloqueado}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                {resumenSinDisponibles ? (
                  <p className="text-sm text-gray-500">
                    No hay cantidades disponibles para devolver en este vale.
                  </p>
                ) : materialesForm.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Debe mantener al menos un material seleccionado para crear la
                    devolucion.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Material
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700 w-32">
                            Disponible
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700 w-40">
                            Cantidad a devolver
                          </th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {materialesForm.map((material) => {
                          const cantidadInvalida =
                            material.cantidad <= 0 ||
                            material.cantidad >
                              material.cantidad_disponible_devolver;
                          return (
                            <tr
                              key={material.material_id}
                              className={`border-b last:border-b-0 ${
                                cantidadInvalida ? "bg-red-50/60" : ""
                              }`}
                            >
                              <td className="py-2 px-3">
                                <p className="font-medium text-gray-900">
                                  {getMaterialNombre(material)}
                                </p>
                                {material.um ? (
                                  <p className="text-xs text-gray-500">
                                    UM: {material.um}
                                  </p>
                                ) : null}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-700">
                                {formatCantidad(material.cantidad_disponible_devolver)}
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={material.cantidad}
                                  onChange={(event) =>
                                    handleCantidadChange(
                                      material.material_id,
                                      event.target.value,
                                    )
                                  }
                                  disabled={submitting || valeBloqueado}
                                  className={`h-9 text-right ${
                                    cantidadInvalida ? "border-red-400" : ""
                                  }`}
                                />
                              </td>
                              <td className="py-2 px-2 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveMaterial(material.material_id)
                                  }
                                  disabled={submitting || valeBloqueado}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Quitar material de esta devolucion"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Historial de devoluciones
                </h3>
                {historial.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Aun no hay devoluciones registradas para este vale.
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            ID
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Fecha
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Responsable
                          </th>
                          <th className="text-right py-2 px-3 font-medium text-gray-700">
                            Materiales
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">
                            Creado por
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historial.map((devolucion) => (
                          <tr key={devolucion.id} className="border-b last:border-b-0">
                            <td className="py-2 px-3 font-mono text-xs">
                              {devolucion.id}
                            </td>
                            <td className="py-2 px-3">
                              {formatFecha(devolucion.fecha_creacion)}
                            </td>
                            <td className="py-2 px-3">
                              {devolucion.responsable_devolucion || "-"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {(devolucion.materiales || []).length}
                            </td>
                            <td className="py-2 px-3">
                              {devolucion.creado_por_ci || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4 mr-2" />
                Crear devolucion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
