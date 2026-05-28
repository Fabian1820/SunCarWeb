"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  Package,
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
import { Textarea } from "@/components/shared/molecule/textarea";
import type {
  AjusteCierreItem,
  CerrarConAjusteRequest,
  Compra,
} from "@/lib/types/feats/compras/compra-types";

interface FilaAjuste {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
  aprobada: number;
  pendiente: number;
  incluir: boolean;
  cantidad_ajuste: number;
  motivo: string;
}

const calcPendiente = (c: number, aprobada: number, ajuste: number): number => {
  const pend = c - (aprobada ?? 0) - (ajuste ?? 0);
  return pend > 0 ? pend : 0;
};

interface CerrarCompraAjusteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compra: Compra | null;
  onSubmit: (compraId: string, payload: CerrarConAjusteRequest) => Promise<void>;
  isLoading?: boolean;
}

export function CerrarCompraAjusteDialog({
  open,
  onOpenChange,
  compra,
  onSubmit,
  isLoading = false,
}: CerrarCompraAjusteDialogProps) {
  const [filas, setFilas] = useState<FilaAjuste[]>([]);
  const [motivoGeneral, setMotivoGeneral] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !compra) return;
    setMotivoGeneral("");
    setError(null);
    setConfirmando(false);
    const initial: FilaAjuste[] = compra.materiales.map((m) => {
      const pendiente = calcPendiente(
        m.cantidad,
        m.cantidad_entrada_aprobada,
        m.cantidad_ajuste_cierre,
      );
      return {
        material_id: m.material_id,
        material_codigo: m.material_codigo,
        material_nombre: m.material_nombre,
        cantidad: m.cantidad,
        aprobada: m.cantidad_entrada_aprobada ?? 0,
        pendiente,
        incluir: pendiente > 0,
        cantidad_ajuste: pendiente,
        motivo: "",
      };
    });
    setFilas(initial);
  }, [open, compra]);

  const filasIncluidas = useMemo(() => filas.filter((f) => f.incluir && f.cantidad_ajuste > 0), [filas]);
  const totalPendiente = useMemo(() => filas.reduce((s, f) => s + f.pendiente, 0), [filas]);
  const totalAjuste = useMemo(() => filasIncluidas.reduce((s, f) => s + f.cantidad_ajuste, 0), [filasIncluidas]);

  const updateFila = (id: string, patch: Partial<FilaAjuste>) => {
    setFilas((prev) => prev.map((f) => (f.material_id === id ? { ...f, ...patch } : f)));
  };

  const updateCantidadAjuste = (id: string, val: string) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return;
    setFilas((prev) =>
      prev.map((f) => {
        if (f.material_id !== id) return f;
        const cantidad = Math.min(n, f.pendiente);
        return { ...f, cantidad_ajuste: cantidad };
      }),
    );
  };

  const filaInvalida = (f: FilaAjuste): string | null => {
    if (!f.incluir) return null;
    if (f.cantidad_ajuste <= 0) return "Cantidad debe ser > 0";
    if (f.cantidad_ajuste > f.pendiente) return `Supera el pendiente (${f.pendiente})`;
    if (!f.motivo.trim()) return "Motivo obligatorio";
    return null;
  };

  const algunaInvalida = filasIncluidas.some((f) => filaInvalida(f) !== null);
  const noHayPendientes = totalPendiente === 0;

  const handleAbrirConfirmacion = () => {
    setError(null);
    if (filasIncluidas.length === 0 && !noHayPendientes) {
      setError("Marca al menos un material para ajustar, o no quedaría nada por cerrar.");
      return;
    }
    const primerErr = filasIncluidas.map(filaInvalida).find((e) => e !== null);
    if (primerErr) {
      setError(`Revisa los materiales: ${primerErr}`);
      return;
    }
    setConfirmando(true);
  };

  const handleSubmit = async () => {
    if (!compra) return;
    setError(null);
    setSubmitting(true);
    try {
      const ajustes: AjusteCierreItem[] = filasIncluidas.map((f) => ({
        material_id: f.material_id,
        cantidad: f.cantidad_ajuste,
        motivo: f.motivo.trim(),
      }));
      await onSubmit(compra.id, {
        ajustes,
        motivo_general: motivoGeneral.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la compra.");
      setConfirmando(false);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onOpenChange(false); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 shrink-0">
              <Lock className="h-4 w-4 text-indigo-700" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">
                Cerrar compra con ajuste
              </DialogTitle>
              {compra && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  <span className="font-medium text-gray-700">{compra.nombre}</span>
                  {" · "}
                  Pendiente total: <span className="font-mono">{totalPendiente}</span>
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 space-y-1">
              <p className="font-medium">Acción irreversible</p>
              <p className="text-xs text-amber-800">
                La compra pasará al estado <strong>cerrada con ajuste</strong>. Las cantidades no recibidas
                quedarán contabilizadas como ajuste y ya no será posible registrar más entradas para esta compra.
              </p>
            </div>
          </div>

          {noHayPendientes ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-900">
                Esta compra ya no tiene materiales pendientes. Puedes cerrar igualmente para marcar el cierre.
              </p>
            </div>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  Materiales con pendiente
                </Label>
                <span className="text-xs text-gray-400">
                  {filasIncluidas.length} ajustes · {totalAjuste} unidades
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10 py-2 px-2"></th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Comprado</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Recibido</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Pendiente</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Ajuste</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => {
                      const err = filaInvalida(f);
                      const sinPendiente = f.pendiente === 0;
                      return (
                        <tr
                          key={f.material_id}
                          className={`border-b border-gray-100 last:border-0 ${
                            sinPendiente
                              ? "bg-gray-50/40 opacity-50"
                              : !f.incluir
                                ? "bg-gray-50/40 opacity-70"
                                : err
                                  ? "bg-red-50/30"
                                  : ""
                          }`}
                        >
                          <td className="py-2 px-2 text-center align-top pt-3">
                            <input
                              type="checkbox"
                              disabled={sinPendiente}
                              checked={f.incluir}
                              onChange={(e) => updateFila(f.material_id, { incluir: e.target.checked })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2 px-3 align-top">
                            <p className="font-medium text-gray-900 leading-tight">{f.material_nombre}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{f.material_codigo}</p>
                          </td>
                          <td className="py-2 px-3 text-center align-top pt-3 text-gray-600 font-mono text-xs">{f.cantidad}</td>
                          <td className="py-2 px-3 text-center align-top pt-3 text-emerald-600 font-mono text-xs">{f.aprobada}</td>
                          <td className="py-2 px-3 text-center align-top pt-3">
                            <span className={`inline-flex font-mono text-xs px-1.5 py-0.5 rounded ${
                              sinPendiente ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {f.pendiente}
                            </span>
                          </td>
                          <td className="py-2 px-3 align-top">
                            <Input
                              type="number"
                              min="0"
                              max={f.pendiente}
                              step="any"
                              disabled={!f.incluir || sinPendiente}
                              value={f.cantidad_ajuste}
                              onChange={(e) => updateCantidadAjuste(f.material_id, e.target.value)}
                              className="h-8 text-center text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 align-top">
                            <Input
                              type="text"
                              placeholder={sinPendiente ? "—" : "Ej: faltante de fábrica"}
                              disabled={!f.incluir || sinPendiente}
                              value={f.motivo}
                              onChange={(e) => updateFila(f.material_id, { motivo: e.target.value })}
                              className="h-8 text-sm"
                            />
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
            </section>
          )}

          <section>
            <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Motivo general del cierre <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Textarea
              value={motivoGeneral}
              onChange={(e) => setMotivoGeneral(e.target.value)}
              placeholder="Ej: Proveedor confirma que no enviará el resto del pedido..."
              rows={2}
              className="resize-none"
            />
          </section>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {confirmando && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-indigo-900">
                ¿Confirmar el cierre de la compra?
              </p>
              <p className="text-xs text-indigo-800">
                Se aplicarán {filasIncluidas.length} ajuste{filasIncluidas.length !== 1 ? "s" : ""} por un total de{" "}
                <strong>{totalAjuste}</strong> unidades. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmando(false)} disabled={busy}>
                  Volver
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sí, cerrar compra
                </Button>
              </div>
            </div>
          )}
        </div>

        {!confirmando && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAbrirConfirmacion}
              disabled={busy || algunaInvalida || (filasIncluidas.length === 0 && !noHayPendientes)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Lock className="h-4 w-4" />
              Cerrar con ajuste
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
