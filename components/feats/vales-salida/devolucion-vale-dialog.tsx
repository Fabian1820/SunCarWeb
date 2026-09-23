"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { parseFechaUtc } from "@/lib/utils/fecha-utc";
import {
  claveSerie,
  limpiarSeries,
  seriesRepetidas,
  unidadesConSerie,
} from "@/lib/utils/numeros-serie";
import type {
  DevolucionVale,
  DevolucionValeResumenMaterial,
  Trabajador,
  ValeSalida,
} from "@/lib/api-types";
import {
  AlertTriangle,
  Hash,
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
  material_nombre?: string;
  um?: string;
  cantidad_salida: number;
  cantidad_devuelta: number;
  cantidad_disponible_devolver: number;
  cantidad: number;
  /** Series del vale que siguen fuera: entre ellas se elige qué vuelve. */
  series_pendientes: string[];
  /** Todas las unidades salieron con serie: la cantidad es lo marcado. */
  requiere_series: boolean;
  series_seleccionadas: string[];
  /** Si el vale no traía series, las que se anoten al devolver (opcional). */
  series_libres: string[];
  mostrar_series_libres: boolean;
  /** Lo escrito o escaneado en el buscador de series, y su aviso. */
  serie_buscada: string;
  aviso_serie: string | null;
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
  const parsed = parseFechaUtc(value);
  if (!parsed) return "-";
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
    | {
        material_nombre?: string;
        material_descripcion?: string;
        material_codigo?: string;
        material_id?: string;
      },
) =>
  material.material_nombre ||
  material.material_descripcion ||
  material.material_codigo ||
  material.material_id ||
  "Material";

const mapResumenToFormRows = (
  materiales: DevolucionValeResumenMaterial[],
): DevolucionMaterialFormRow[] =>
  materiales
    .map((material) => {
      const disponible = toSafeNumber(material.cantidad_disponible_devolver);
      const pendientes = material.numeros_serie_pendientes ?? [];
      const requiere = Boolean(material.requiere_series) && pendientes.length > 0;
      // Por defecto se devuelve todo lo disponible: con series, todas marcadas.
      const seleccionadas = pendientes.slice(0, unidadesConSerie(disponible));
      return {
        material_id: material.material_id,
        material_codigo: material.material_codigo,
        material_descripcion: material.material_descripcion,
        material_nombre: material.material_nombre,
        um: material.um,
        cantidad_salida: toSafeNumber(material.cantidad_salida),
        cantidad_devuelta: toSafeNumber(material.cantidad_devuelta),
        cantidad_disponible_devolver: disponible,
        cantidad: requiere ? seleccionadas.length : disponible,
        series_pendientes: pendientes,
        requiere_series: requiere,
        series_seleccionadas: seleccionadas,
        series_libres: [],
        mostrar_series_libres: false,
        serie_buscada: "",
        aviso_serie: null,
      };
    })
    .filter((material) => material.cantidad_disponible_devolver > 0);

/**
 * Qué impide devolver esta fila por sus series, o null. Mismas reglas que el
 * backend (`_validar_series_devolucion`), para avisar antes de enviar.
 */
const problemaSeries = (material: DevolucionMaterialFormRow): string | null => {
  const unidades = unidadesConSerie(material.cantidad);
  if (material.series_pendientes.length > 0) {
    if (material.requiere_series && material.series_seleccionadas.length === 0) {
      return "Marca qué unidades vuelven.";
    }
    if (material.series_seleccionadas.length > unidades) {
      return `Hay ${material.series_seleccionadas.length} series marcadas para ${formatCantidad(
        material.cantidad,
      )} unidades.`;
    }
    return null;
  }
  if (!material.mostrar_series_libres) return null;
  const libres = limpiarSeries(material.series_libres.slice(0, unidades));
  const repetidas = seriesRepetidas(libres);
  if (repetidas.length > 0) return `La serie ${repetidas[0]} está repetida.`;
  return null;
};

const seriesAEnviar = (material: DevolucionMaterialFormRow): string[] => {
  if (material.series_pendientes.length > 0) return material.series_seleccionadas;
  if (!material.mostrar_series_libres) return [];
  return limpiarSeries(
    material.series_libres.slice(0, unidadesConSerie(material.cantidad)),
  );
};

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
    !vale || vale.estado === "anulado";

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
    const term = responsableDevolucion.trim();
    if (!term) {
      setResponsableResults([]);
      setShowResponsableDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setTrabajadoresLoading(true);
      try {
        const results = await TrabajadorService.buscarTrabajadores(term);
        const filtered = (Array.isArray(results) ? results : []).slice(0, 15);
        setResponsableResults(filtered as unknown as Trabajador[]);
        setShowResponsableDropdown(filtered.length > 0);
      } catch {
        setResponsableResults([]);
      } finally {
        setTrabajadoresLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [responsableDevolucion]);

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

  const actualizarFila = (
    materialId: string,
    cambio: (material: DevolucionMaterialFormRow) => DevolucionMaterialFormRow,
  ) => {
    setMaterialesForm((prev) =>
      prev.map((material) =>
        material.material_id === materialId ? cambio(material) : material,
      ),
    );
  };

  const conSeleccion = (
    material: DevolucionMaterialFormRow,
    seleccionadas: string[],
  ): DevolucionMaterialFormRow => ({
    ...material,
    series_seleccionadas: seleccionadas,
    // Si todas salieron con serie, devolver N unidades es marcar N series.
    cantidad: material.requiere_series ? seleccionadas.length : material.cantidad,
    aviso_serie: null,
  });

  const handleToggleSerie = (materialId: string, serie: string) => {
    actualizarFila(materialId, (material) =>
      conSeleccion(
        material,
        material.series_seleccionadas.includes(serie)
          ? material.series_seleccionadas.filter((s) => s !== serie)
          : // Se conserva el orden del vale.
            material.series_pendientes.filter(
              (s) => s === serie || material.series_seleccionadas.includes(s),
            ),
      ),
    );
  };

  const handleMarcarTodas = (materialId: string, todas: boolean) => {
    actualizarFila(materialId, (material) =>
      conSeleccion(material, todas ? [...material.series_pendientes] : []),
    );
  };

  // Escribir o escanear una serie la busca en el vale y la marca. Así no hay
  // que buscarla a ojo entre las casillas, y una serie que no salió en este
  // vale se ve al momento en vez de al guardar.
  const handleBuscarSerie = (materialId: string) => {
    const fila = materialesForm.find((m) => m.material_id === materialId);
    const texto = fila?.serie_buscada.trim() ?? "";
    if (!fila || !texto) return;
    const clave = claveSerie(texto);
    const encontrada = fila.series_pendientes.find((s) => claveSerie(s) === clave);
    if (encontrada) {
      actualizarFila(materialId, (material) => ({
        ...conSeleccion(
          material,
          material.series_pendientes.filter(
            (s) => s === encontrada || material.series_seleccionadas.includes(s),
          ),
        ),
        serie_buscada: "",
        aviso_serie: material.series_seleccionadas.includes(encontrada)
          ? `${encontrada} ya estaba marcada.`
          : null,
      }));
      return;
    }
    const resumen = resumenMateriales.find((m) => m.material_id === materialId);
    const yaDevuelta = (resumen?.numeros_serie_devueltos ?? []).find(
      (s) => claveSerie(s) === clave,
    );
    const deOtro = resumenMateriales.find(
      (m) =>
        m.material_id !== materialId &&
        (m.numeros_serie ?? []).some((s) => claveSerie(s) === clave),
    );
    const aviso = yaDevuelta
      ? `${yaDevuelta} ya se devolvió antes.`
      : deOtro
        ? `${texto} es de ${getMaterialNombre(deOtro)}, no de este material.`
        : `${texto} no salió en este vale.`;
    actualizarFila(materialId, (material) => ({ ...material, aviso_serie: aviso }));
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
          material.cantidad <= material.cantidad_disponible_devolver &&
          !problemaSeries(material),
      ),
    [materialesForm],
  );

  const tieneCantidadInvalida = useMemo(
    () =>
      materialesForm.some(
        (material) =>
          material.cantidad <= 0 ||
          material.cantidad > material.cantidad_disponible_devolver ||
          Boolean(problemaSeries(material)),
      ),
    [materialesForm],
  );

  const canSubmit =
    !valeBloqueado &&
    !loading &&
    !submitting &&
    responsableDevolucion.trim().length > 0 &&
    comentario.trim().length > 0 &&
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
        title: "Revisa la devolución",
        description:
          "Cada cantidad devuelta debe ser mayor que 0, no puede exceder lo disponible y sus números de serie deben cuadrar.",
        variant: "destructive",
      });
      return;
    }

    if (!comentario.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Debe indicar el motivo de la devolucion.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const nuevaDevolucion = await DevolucionValeService.createDevolucion({
        vale_id: valeId,
        responsable_devolucion: responsableDevolucion.trim(),
        comentario: comentario.trim(),
        materiales: materialesValidos.map((material) => {
          const series = seriesAEnviar(material);
          return {
            material_id: material.material_id,
            cantidad: material.cantidad,
            ...(series.length > 0 && { numeros_serie: series }),
          };
        }),
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
              No se puede crear devoluciones para un vale anulado.
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
                    {!trabajadoresLoading && responsableResults.length === 0 && responsableDevolucion.trim() ? (
                      <p className="text-xs text-gray-500">
                        No se encontraron trabajadores.
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
                    <Label htmlFor="comentario-devolucion">
                      Motivo de la devolución{" "}
                      <span className="text-red-600">*</span>
                    </Label>
                    <Textarea
                      id="comentario-devolucion"
                      value={comentario}
                      onChange={(event) => setComentario(event.target.value)}
                      placeholder="Describa por que se realiza la devolucion..."
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
                          const problema = problemaSeries(material);
                          const conSeriesDelVale = material.series_pendientes.length > 0;
                          const unidades = unidadesConSerie(material.cantidad);
                          const muestraSeries = conSeriesDelVale || unidades > 0;
                          return (
                            <Fragment key={material.material_id}>
                            <tr
                              className={`${muestraSeries ? "" : "border-b"} ${
                                cantidadInvalida || problema ? "bg-red-50/60" : ""
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
                                  disabled={
                                    submitting || valeBloqueado || material.requiere_series
                                  }
                                  title={
                                    material.requiere_series
                                      ? "Todas las unidades salieron con serie: la cantidad es la de series marcadas"
                                      : undefined
                                  }
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
                            {muestraSeries ? (
                              <tr
                                className={`border-b last:border-b-0 ${
                                  cantidadInvalida || problema ? "bg-red-50/60" : ""
                                }`}
                              >
                                <td colSpan={4} className="px-3 pb-3 pt-0">
                                  {conSeriesDelVale ? (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-medium text-gray-600">
                                          N° de serie que vuelven
                                          {material.requiere_series ? (
                                            <span className="text-red-600"> *</span>
                                          ) : (
                                            " (opcional)"
                                          )}
                                        </span>
                                        <button
                                          type="button"
                                          className="text-xs text-blue-600 hover:text-blue-800"
                                          onClick={() =>
                                            handleMarcarTodas(material.material_id, true)
                                          }
                                          disabled={submitting || valeBloqueado}
                                        >
                                          Todas
                                        </button>
                                        <button
                                          type="button"
                                          className="text-xs text-blue-600 hover:text-blue-800"
                                          onClick={() =>
                                            handleMarcarTodas(material.material_id, false)
                                          }
                                          disabled={submitting || valeBloqueado}
                                        >
                                          Ninguna
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {material.series_pendientes.map((serie) => {
                                          const marcada =
                                            material.series_seleccionadas.includes(serie);
                                          return (
                                            <button
                                              key={serie}
                                              type="button"
                                              onClick={() =>
                                                handleToggleSerie(material.material_id, serie)
                                              }
                                              disabled={submitting || valeBloqueado}
                                              aria-pressed={marcada}
                                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono ${
                                                marcada
                                                  ? "bg-blue-600 text-white border-blue-600"
                                                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                                              }`}
                                            >
                                              <Hash className="h-3 w-3" />
                                              {serie}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <Input
                                        placeholder="Escribe o escanea una serie y pulsa Enter"
                                        value={material.serie_buscada}
                                        onChange={(event) => {
                                          const valor = event.target.value;
                                          actualizarFila(material.material_id, (m) => ({
                                            ...m,
                                            serie_buscada: valor,
                                            aviso_serie: null,
                                          }));
                                        }}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleBuscarSerie(material.material_id);
                                          }
                                        }}
                                        disabled={submitting || valeBloqueado}
                                        className="h-8 max-w-sm text-xs"
                                      />
                                    </div>
                                  ) : material.mostrar_series_libres ? (
                                    <div className="space-y-2">
                                      <span className="text-xs font-medium text-gray-600">
                                        N° de serie de lo devuelto (opcional; el vale no los
                                        traía)
                                      </span>
                                      <div className="grid gap-2 sm:grid-cols-3">
                                        {Array.from({ length: unidades }, (_, i) => (
                                          <Input
                                            key={i}
                                            placeholder={`Unidad ${i + 1}`}
                                            value={material.series_libres[i] ?? ""}
                                            onChange={(event) => {
                                              const valor = event.target.value;
                                              actualizarFila(material.material_id, (m) => {
                                                const libres = Array.from(
                                                  { length: Math.max(unidades, m.series_libres.length) },
                                                  (_, j) => m.series_libres[j] ?? "",
                                                );
                                                libres[i] = valor;
                                                return { ...m, series_libres: libres };
                                              });
                                            }}
                                            disabled={submitting || valeBloqueado}
                                            className="h-8 text-xs"
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                      onClick={() =>
                                        actualizarFila(material.material_id, (m) => ({
                                          ...m,
                                          mostrar_series_libres: true,
                                        }))
                                      }
                                      disabled={submitting || valeBloqueado}
                                    >
                                      <Hash className="h-3 w-3" />
                                      Anotar N° de serie de lo devuelto
                                    </button>
                                  )}
                                  {material.aviso_serie ? (
                                    <p className="mt-1 text-xs text-amber-700">
                                      {material.aviso_serie}
                                    </p>
                                  ) : null}
                                  {problema ? (
                                    <p className="mt-1 text-xs text-red-600">{problema}</p>
                                  ) : null}
                                </td>
                              </tr>
                            ) : null}
                            </Fragment>
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
                            N° de serie
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
                            <td className="py-2 px-3 font-mono text-xs text-gray-600">
                              {(devolucion.materiales || [])
                                .flatMap((m) => m.numeros_serie ?? [])
                                .join(" · ") || "-"}
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
