"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  PackagePlus,
  Warehouse,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type { Compra } from "@/lib/types/feats/compras/compra-types";
import type { Almacen } from "@/lib/types/feats/inventario/inventario-types";
import type {
  PoolKey,
  SolicitudEntradaAlmacen,
  SolicitudEntradaAlmacenCreateData,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";
import {
  POOL_LABELS,
  POOLS,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";

interface FilaMaterial {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  pendiente: number;
  cantidad_total: number;
  split: Record<PoolKey, number>;
  incluir: boolean;
  /** Solo se usa en modo "almacén por línea" */
  almacen_id: string;
  /** Motivo cuando cantidad < pendiente */
  motivo_parcial: string;
}

const epsilon = 0.0001;

const calcPendiente = (cantidad: number, aprobada: number, ajuste?: number): number => {
  const pend = cantidad - (aprobada ?? 0) - (ajuste ?? 0);
  return pend > 0 ? pend : 0;
};

interface CrearSolicitudEntradaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compra: Compra | null;
  almacenes: Almacen[];
  almacenIdInicial?: string;
  /**
   * Callback invocado una vez por solicitud. El dialog se encarga de agrupar
   * por almacén y llamar tantas veces como solicitudes haya. Si lanza, el
   * dialog para y muestra el error.
   */
  onSubmit: (data: SolicitudEntradaAlmacenCreateData) => Promise<void>;
  /**
   * Si se pasa una solicitud existente, el dialog entra en modo edición:
   * - desactiva el toggle "almacén por línea" (solicitud única)
   * - precarga las filas desde la solicitud (no desde la compra)
   * - al submit llama onUpdate en lugar de onSubmit
   */
  solicitudExistente?: SolicitudEntradaAlmacen | null;
  onUpdate?: (id: string, data: Partial<SolicitudEntradaAlmacenCreateData>) => Promise<void>;
  isLoading?: boolean;
}

export function CrearSolicitudEntradaDialog({
  open,
  onOpenChange,
  compra,
  almacenes,
  almacenIdInicial,
  onSubmit,
  solicitudExistente,
  onUpdate,
  isLoading = false,
}: CrearSolicitudEntradaDialogProps) {
  const esEdicion = Boolean(solicitudExistente);
  const [modoPorLinea, setModoPorLinea] = useState(false);
  const [almacenGlobalId, setAlmacenGlobalId] = useState<string>("");
  const [filas, setFilas] = useState<FilaMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ hechas: number; total: number } | null>(null);

  useEffect(() => {
    if (!open || !compra) return;
    setError(null);
    setProgress(null);

    if (solicitudExistente) {
      // Modo edición: precargar desde la solicitud existente
      setModoPorLinea(false);
      setAlmacenGlobalId(solicitudExistente.almacen_id);
      const initial: FilaMaterial[] = solicitudExistente.materiales.map((m) => {
        // El pendiente de la compra incluye lo "no aprobado" — la cantidad
        // de esta solicitud pendiente no se descuenta hasta que se apruebe,
        // así que el operador puede ajustarla libremente hasta el pendiente.
        const mat = compra.materiales.find((cm) => cm.material_id === m.material_id);
        const pendiente = mat
          ? calcPendiente(mat.cantidad, mat.cantidad_entrada_aprobada, mat.cantidad_ajuste_cierre)
          : m.cantidad_total;
        return {
          material_id: m.material_id,
          material_codigo: m.material_codigo,
          material_nombre: m.material_nombre,
          pendiente,
          cantidad_total: m.cantidad_total,
          split: { ...m.split },
          incluir: true,
          almacen_id: solicitudExistente.almacen_id,
          motivo_parcial: m.motivo_parcial ?? "",
        };
      });
      setFilas(initial);
      return;
    }

    // Modo creación
    setAlmacenGlobalId(almacenIdInicial ?? "");
    setModoPorLinea(false);
    const initial: FilaMaterial[] = compra.materiales
      .map((m) => {
        const pendiente = calcPendiente(
          m.cantidad,
          m.cantidad_entrada_aprobada,
          m.cantidad_ajuste_cierre,
        );
        return {
          material_id: m.material_id,
          material_codigo: m.material_codigo,
          material_nombre: m.material_nombre,
          pendiente,
          cantidad_total: pendiente,
          split: { indistinto: pendiente, instaladora: 0, ventas: 0 },
          incluir: pendiente > 0,
          almacen_id: almacenIdInicial ?? "",
          motivo_parcial: "",
        };
      })
      .filter((f) => f.pendiente > 0);
    setFilas(initial);
  }, [open, compra, almacenIdInicial, solicitudExistente]);

  const filasIncluidas = useMemo(() => filas.filter((f) => f.incluir), [filas]);
  const totalSolicitado = filasIncluidas.reduce((s, f) => s + f.cantidad_total, 0);

  const updateFila = (id: string, patch: Partial<FilaMaterial>) => {
    setFilas((prev) => prev.map((f) => (f.material_id === id ? { ...f, ...patch } : f)));
  };

  const updateCantidad = (id: string, val: string) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return;
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== id) return f;
        const cantidad = Math.min(n, f.pendiente);
        return {
          ...f,
          cantidad_total: cantidad,
          split: { indistinto: cantidad, instaladora: 0, ventas: 0 },
        };
      }),
    );
  };

  const updateSplit = (id: string, pool: PoolKey, val: string) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return;
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== id) return f;
        return { ...f, split: { ...f.split, [pool]: n } };
      }),
    );
  };

  const balancearAIndistinto = (id: string) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== id) return f;
        return { ...f, split: { indistinto: f.cantidad_total, instaladora: 0, ventas: 0 } };
      }),
    );
  };

  const filaInvalida = (f: FilaMaterial): string | null => {
    if (!f.incluir) return null;
    if (f.cantidad_total <= 0) return "Cantidad debe ser > 0";
    if (f.cantidad_total > f.pendiente + epsilon) return `Supera el pendiente (${f.pendiente})`;
    const sumaSplit = f.split.indistinto + f.split.instaladora + f.split.ventas;
    if (Math.abs(sumaSplit - f.cantidad_total) > epsilon) {
      return `Suma del split (${sumaSplit}) ≠ cantidad (${f.cantidad_total})`;
    }
    // motivo_parcial obligatorio si cantidad < pendiente
    if (f.cantidad_total < f.pendiente - epsilon && !f.motivo_parcial.trim()) {
      return "Motivo obligatorio para cantidad parcial";
    }
    if (modoPorLinea && !f.almacen_id) {
      return "Selecciona almacén destino";
    }
    return null;
  };

  const algunaInvalida = filasIncluidas.some((f) => filaInvalida(f) !== null);

  /** Agrupa filas por almacen_id (o usa el almacén global). */
  const agruparPorAlmacen = (): Map<string, FilaMaterial[]> => {
    const map = new Map<string, FilaMaterial[]>();
    for (const f of filasIncluidas) {
      const key = modoPorLinea ? f.almacen_id : almacenGlobalId;
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return map;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!compra) return;
    if (!modoPorLinea && !almacenGlobalId) {
      setError("Selecciona un almacén destino.");
      return;
    }
    if (filasIncluidas.length === 0) {
      setError("Marca al menos un material.");
      return;
    }
    const primerErr = filasIncluidas.map(filaInvalida).find((e) => e !== null);
    if (primerErr) {
      setError(`Revisa los materiales: ${primerErr}`);
      return;
    }

    const buildMateriales = (lineas: FilaMaterial[]) =>
      lineas.map((f) => ({
        material_id: f.material_id,
        material_codigo: f.material_codigo,
        material_nombre: f.material_nombre,
        cantidad_total: f.cantidad_total,
        split: f.split,
        ...(f.cantidad_total < f.pendiente - epsilon && f.motivo_parcial.trim()
          ? { motivo_parcial: f.motivo_parcial.trim() }
          : {}),
      }));

    setSubmitting(true);

    // Modo edición: una sola llamada PATCH
    if (esEdicion && solicitudExistente && onUpdate) {
      try {
        await onUpdate(solicitudExistente.id, {
          materiales: buildMateriales(filasIncluidas),
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo actualizar la solicitud.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Modo creación: N POSTs
    const grupos = agruparPorAlmacen();
    if (grupos.size === 0) {
      setError("No hay materiales válidos para enviar.");
      setSubmitting(false);
      return;
    }

    setProgress({ hechas: 0, total: grupos.size });
    let hechas = 0;
    try {
      for (const [almacenId, lineas] of grupos) {
        await onSubmit({
          compra_id: compra.id,
          almacen_id: almacenId,
          materiales: buildMateriales(lineas),
        });
        hechas++;
        setProgress({ hechas, total: grupos.size });
      }
      onOpenChange(false);
    } catch (e) {
      const base = e instanceof Error ? e.message : "No se pudo crear la solicitud.";
      setError(
        grupos.size > 1
          ? `${base} (${hechas} de ${grupos.size} solicitudes ya fueron creadas)`
          : base,
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const busy = isLoading || submitting;
  const sinPendientes = compra !== null && filas.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <PackagePlus className="h-4 w-4 text-blue-700" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">
                {esEdicion ? "Editar solicitud pendiente" : "Nueva solicitud de entrada al almacén"}
              </DialogTitle>
              {compra && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Compra: <span className="font-medium text-gray-700">{compra.nombre}</span>
                  {esEdicion && solicitudExistente && (
                    <> · Solicitud <span className="font-mono">#{solicitudExistente.id.slice(-8)}</span></>
                  )}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {!compra ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">No hay compra seleccionada.</p>
            </div>
          ) : sinPendientes ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800">
                Todos los materiales de esta compra ya fueron recibidos. No hay nada pendiente.
              </p>
            </div>
          ) : (
            <>
              {/* Toggle de modo: solo en creación, no en edición */}
              {!esEdicion && (
                <section className="flex flex-wrap items-center gap-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                    Modo
                  </Label>
                  <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModoPorLinea(false)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        !modoPorLinea
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Un almacén para todo
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModoPorLinea(true)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                        modoPorLinea
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Almacén por material
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    {modoPorLinea
                      ? "Se creará una solicitud por cada almacén distinto."
                      : "Todos los materiales van al mismo almacén; se crea una sola solicitud."}
                  </p>
                </section>
              )}

              {!modoPorLinea && (
                <section>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                    Almacén destino <span className="text-red-500">*</span>
                  </Label>
                  {esEdicion ? (
                    <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {almacenes.find((a) => a.id === almacenGlobalId)?.nombre ?? almacenGlobalId.slice(-8)}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">no editable</span>
                    </div>
                  ) : (
                    <Select value={almacenGlobalId} onValueChange={setAlmacenGlobalId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecciona un almacén..." />
                      </SelectTrigger>
                      <SelectContent>
                        {almacenes.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400">No hay almacenes disponibles</div>
                        ) : (
                          almacenes.map((a) => (
                            <SelectItem key={a.id} value={a.id!}>
                              {a.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-gray-400" />
                    Materiales a recepcionar
                  </Label>
                  <span className="text-xs text-gray-400">
                    {filasIncluidas.length} de {filas.length} · total: {totalSolicitado}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-10 py-2 px-2"></th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Pend.</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Cantidad</th>
                        {modoPorLinea && (
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Almacén destino</th>
                        )}
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Split por pool</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-56">Motivo si parcial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f) => {
                        const err = filaInvalida(f);
                        const sumaSplit = f.split.indistinto + f.split.instaladora + f.split.ventas;
                        const sumaOk = Math.abs(sumaSplit - f.cantidad_total) <= epsilon;
                        const esParcial = f.cantidad_total < f.pendiente - epsilon;
                        return (
                          <tr
                            key={f.material_id}
                            className={`border-b border-gray-100 last:border-0 transition-colors ${
                              !f.incluir
                                ? "bg-gray-50/60 opacity-60"
                                : err
                                  ? "bg-red-50/30"
                                  : "hover:bg-gray-50/40"
                            }`}
                          >
                            <td className="py-2 px-2 text-center align-top pt-3">
                              <input
                                type="checkbox"
                                checked={f.incluir}
                                onChange={(e) => updateFila(f.material_id, { incluir: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 px-3 align-top">
                              <p className="font-medium text-gray-900 leading-tight">{f.material_nombre}</p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{f.material_codigo}</p>
                            </td>
                            <td className="py-2 px-3 text-center align-top pt-3 font-mono text-xs text-gray-600">
                              {f.pendiente}
                            </td>
                            <td className="py-2 px-3 align-top">
                              <Input
                                type="number"
                                min="0"
                                max={f.pendiente}
                                step="any"
                                disabled={!f.incluir}
                                value={f.cantidad_total}
                                onChange={(e) => updateCantidad(f.material_id, e.target.value)}
                                className="h-8 text-center text-sm"
                              />
                            </td>
                            {modoPorLinea && (
                              <td className="py-2 px-3 align-top">
                                <Select
                                  value={f.almacen_id}
                                  onValueChange={(v) => updateFila(f.material_id, { almacen_id: v })}
                                  disabled={!f.incluir}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="—" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {almacenes.map((a) => (
                                      <SelectItem key={a.id} value={a.id!}>{a.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            )}
                            <td className="py-2 px-3 align-top">
                              <div className="flex flex-wrap items-end gap-2">
                                {POOLS.map((pool) => (
                                  <div key={pool} className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                      {POOL_LABELS[pool]}
                                    </span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      disabled={!f.incluir}
                                      value={f.split[pool]}
                                      onChange={(e) => updateSplit(f.material_id, pool, e.target.value)}
                                      className="h-8 w-20 text-center text-sm"
                                    />
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  disabled={!f.incluir}
                                  onClick={() => balancearAIndistinto(f.material_id)}
                                  className="h-8 px-2 text-[10px] font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Mover todo al pool Indistinto"
                                >
                                  Reset
                                </button>
                              </div>
                              {f.incluir && (
                                <p className={`text-[10px] mt-1 ${sumaOk ? "text-gray-400" : "text-red-600"}`}>
                                  Suma: {sumaSplit} {sumaOk ? "✓" : `≠ ${f.cantidad_total}`}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-3 align-top">
                              {esParcial ? (
                                <Input
                                  type="text"
                                  placeholder="Ej: faltante de fábrica"
                                  disabled={!f.incluir}
                                  value={f.motivo_parcial}
                                  onChange={(e) => updateFila(f.material_id, { motivo_parcial: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              ) : (
                                <span className="text-[10px] text-gray-300 italic">— (cantidad completa)</span>
                              )}
                              {err && (
                                <p className="text-[10px] text-red-600 mt-0.5">{err}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="leading-relaxed">
                    <strong className="text-gray-500">Indistinto</strong> queda disponible para cualquier sector.
                    <strong className="text-gray-500"> Instaladora</strong> reservado para vales de instalación.
                    <strong className="text-gray-500"> Ventas</strong> para tiendas. El costo se toma de la
                    ficha de la compra (o queda en 0 hasta que se pondere).
                  </span>
                </div>
              </section>

              {modoPorLinea && (() => {
                const grupos = agruparPorAlmacen();
                if (grupos.size === 0) return null;
                return (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                    Se crearán <strong>{grupos.size} solicitud{grupos.size !== 1 ? "es" : ""}</strong>:{" "}
                    {Array.from(grupos.entries()).map(([almId, lineas], idx) => {
                      const almNombre = almacenes.find((a) => a.id === almId)?.nombre ?? almId.slice(-6);
                      return (
                        <span key={almId}>
                          {idx > 0 && " · "}
                          <strong>{almNombre}</strong> ({lineas.length} mat.)
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}

          {progress && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2 text-sm text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando solicitud {progress.hechas + 1} de {progress.total}...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="px-5">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              busy ||
              !compra ||
              sinPendientes ||
              algunaInvalida ||
              filasIncluidas.length === 0 ||
              (!modoPorLinea && !almacenGlobalId)
            }
            className="px-5 bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {esEdicion
              ? "Guardar cambios"
              : modoPorLinea && agruparPorAlmacen().size > 1
                ? `Crear ${agruparPorAlmacen().size} solicitudes`
                : "Crear solicitud"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
