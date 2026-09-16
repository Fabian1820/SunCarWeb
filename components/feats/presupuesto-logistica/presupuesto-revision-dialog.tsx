"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { cn } from "@/lib/utils";
import { TablaTotales } from "./tabla-totales";
import type {
  DecisionItem,
  EstadoItemPresupuesto,
  PresupuestoLogistica,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";
import { nombreMes } from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

type Clave = string;

const clave = (sedeNombre: string, numero: number): Clave =>
  `${sedeNombre}#${numero}`;

interface EstadoRevision {
  estado: EstadoItemPresupuesto;
  comentario: string;
  importeSugerido: string;
}

const fmt = (valor: number | null, moneda: string | null): string =>
  valor === null
    ? "—"
    : `${valor.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${moneda ?? ""}`.trim();

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  presupuesto: PresupuestoLogistica | null;
  guardando: boolean;
  onRevisar: (id: string, decisiones: DecisionItem[]) => Promise<unknown>;
  onResolver: (id: string, comentario?: string | null) => Promise<unknown>;
}

export function PresupuestoRevisionDialog({
  abierto,
  onCerrar,
  presupuesto,
  guardando,
  onRevisar,
  onResolver,
}: Props) {
  const [decisiones, setDecisiones] = useState<Record<Clave, EstadoRevision>>({});
  const [comentarioGeneral, setComentarioGeneral] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || !presupuesto) return;
    const inicial: Record<Clave, EstadoRevision> = {};
    for (const sede of presupuesto.sedes) {
      for (const item of sede.items) {
        inicial[clave(sede.sede_nombre, item.numero)] = {
          estado: item.estado,
          comentario: item.comentario_rechazo ?? "",
          importeSugerido:
            item.importe_sugerido === null ? "" : String(item.importe_sugerido),
        };
      }
    }
    setDecisiones(inicial);
    setComentarioGeneral("");
    setErrorLocal(null);
  }, [abierto, presupuesto]);

  const resumen = useMemo(() => {
    const valores = Object.values(decisiones);
    return {
      aprobados: valores.filter((d) => d.estado === "aprobado").length,
      rechazados: valores.filter((d) => d.estado === "rechazado").length,
      pendientes: valores.filter((d) => d.estado === "pendiente").length,
      total: valores.length,
    };
  }, [decisiones]);

  if (!presupuesto) return null;

  const marcar = (k: Clave, estado: EstadoItemPresupuesto) => {
    setDecisiones((prev) => ({
      ...prev,
      [k]: { ...prev[k], estado },
    }));
  };

  const construirDecisiones = (): DecisionItem[] =>
    presupuesto.sedes.flatMap((sede) =>
      sede.items.map((item) => {
        const k = clave(sede.sede_nombre, item.numero);
        const d = decisiones[k];
        const sugerido = d?.importeSugerido.trim();
        return {
          sede_nombre: sede.sede_nombre,
          numero: item.numero,
          estado: d?.estado ?? "pendiente",
          comentario_rechazo:
            d?.estado === "rechazado" ? d.comentario.trim() || null : null,
          importe_sugerido:
            d?.estado === "rechazado" && sugerido ? Number(sugerido) : null,
          moneda_sugerida: d?.estado === "rechazado" ? item.moneda : null,
        };
      }),
    );

  const guardarRevision = async () => {
    setErrorLocal(null);
    try {
      await onRevisar(presupuesto.id, construirDecisiones());
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "No se pudo guardar la revisión");
    }
  };

  const cerrarRonda = async () => {
    setErrorLocal(null);
    if (resumen.pendientes > 0 && resumen.rechazados === 0) {
      setErrorLocal(
        `Quedan ${resumen.pendientes} ítems sin revisar. Apruébalos o recházalos antes de cerrar.`,
      );
      return;
    }
    try {
      await onRevisar(presupuesto.id, construirDecisiones());
      await onResolver(presupuesto.id, comentarioGeneral.trim() || null);
      onCerrar();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "No se pudo cerrar la ronda");
    }
  };

  const devolvera = resumen.rechazados > 0;

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Revisar {presupuesto.numero} · {nombreMes(presupuesto.mes)} {presupuesto.anio}
          </DialogTitle>
          <DialogDescription>
            Con un solo ítem rechazado el documento entero vuelve a quien lo
            confeccionó. El importe sugerido es orientativo: no sustituye al del
            presupuesto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {presupuesto.sedes
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((sede) => (
              <div
                key={`${sede.orden}-${sede.sede_nombre}`}
                className="rounded-lg border border-slate-200"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {sede.sede_nombre}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="w-10 px-2 py-1.5">No.</th>
                        <th className="px-2 py-1.5">Local / Área</th>
                        <th className="px-2 py-1.5">Material</th>
                        <th className="w-24 px-2 py-1.5">U/M</th>
                        <th className="w-28 px-2 py-1.5 text-right">Importe</th>
                        <th className="w-[230px] px-2 py-1.5">Decisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sede.items.map((item) => {
                        const k = clave(sede.sede_nombre, item.numero);
                        const d = decisiones[k];
                        const estado = d?.estado ?? "pendiente";
                        return (
                          <tr
                            key={k}
                            className={cn(
                              "border-t border-slate-100 align-top",
                              estado === "aprobado" && "bg-emerald-50/50",
                              estado === "rechazado" && "bg-rose-50/50",
                            )}
                          >
                            <td className="px-2 py-2 text-xs text-slate-500">
                              {item.numero}
                            </td>
                            <td className="px-2 py-2">{item.local ?? "—"}</td>
                            <td className="px-2 py-2">{item.material}</td>
                            <td className="px-2 py-2 text-slate-500">
                              {item.cantidad_um ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">
                              {fmt(item.importe, item.moneda)}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={estado === "aprobado" ? "default" : "outline"}
                                  className={cn(
                                    "h-7 px-2",
                                    estado === "aprobado" &&
                                      "bg-emerald-600 hover:bg-emerald-700",
                                  )}
                                  onClick={() => marcar(k, "aprobado")}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={estado === "rechazado" ? "default" : "outline"}
                                  className={cn(
                                    "h-7 px-2",
                                    estado === "rechazado" &&
                                      "bg-rose-600 hover:bg-rose-700",
                                  )}
                                  onClick={() => marcar(k, "rechazado")}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {estado === "rechazado" && (
                                <div className="mt-2 space-y-1.5">
                                  <Input
                                    className="h-7 text-xs"
                                    placeholder="Comentario (opcional)"
                                    value={d?.comentario ?? ""}
                                    onChange={(e) =>
                                      setDecisiones((prev) => ({
                                        ...prev,
                                        [k]: { ...prev[k], comentario: e.target.value },
                                      }))
                                    }
                                  />
                                  <Input
                                    className="h-7 text-xs"
                                    inputMode="decimal"
                                    placeholder={`Importe sugerido (${item.moneda ?? "CUP"})`}
                                    value={d?.importeSugerido ?? ""}
                                    onChange={(e) =>
                                      setDecisiones((prev) => ({
                                        ...prev,
                                        [k]: {
                                          ...prev[k],
                                          importeSugerido: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Presupuesto Total
            </h4>
            <TablaTotales totales={presupuesto.totales} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Comentario general {devolvera ? "(al devolver)" : "(opcional)"}
            </label>
            <Textarea
              className="mt-1"
              rows={2}
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
            />
          </div>

          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              devolvera
                ? "border-orange-200 bg-orange-50 text-orange-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900",
            )}
          >
            {resumen.aprobados} aprobados · {resumen.rechazados} rechazados ·{" "}
            {resumen.pendientes} sin revisar.{" "}
            {devolvera
              ? "Al cerrar, el presupuesto vuelve a quien lo confeccionó para ajustarlo."
              : resumen.pendientes > 0
                ? "Revisa los que faltan para poder cerrar."
                : "Al cerrar, el presupuesto queda aprobado."}
          </div>

          {errorLocal && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorLocal}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={guardarRevision} disabled={guardando}>
            Guardar sin cerrar
          </Button>
          <Button
            onClick={cerrarRonda}
            disabled={guardando}
            className={devolvera ? "bg-orange-600 hover:bg-orange-700" : undefined}
          >
            {guardando
              ? "Procesando…"
              : devolvera
                ? "Devolver para ajuste"
                : "Aprobar presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
