"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Warehouse,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Badge } from "@/components/shared/atom/badge";
import {
  POOL_LABELS,
  POOLS,
  SOLICITUD_ENTRADA_ESTADO_LABELS,
  type AprobarSolicitudRequest,
  type DenegarSolicitudRequest,
  type EstadoSolicitudEntrada,
  type SolicitudEntradaAlmacen,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function EstadoBadge({ estado }: { estado: EstadoSolicitudEntrada }) {
  const styles: Record<EstadoSolicitudEntrada, string> = {
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    aprobada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    denegada: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[estado]}`}>
      {SOLICITUD_ENTRADA_ESTADO_LABELS[estado]}
    </Badge>
  );
}

interface SolicitudEntradaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudEntradaAlmacen | null;
  compraName?: string;
  almacenName?: string;
  onAprobar: (id: string, payload: AprobarSolicitudRequest) => Promise<void>;
  onDenegar: (id: string, payload: DenegarSolicitudRequest) => Promise<void>;
  isResolving?: boolean;
}

export function SolicitudEntradaDetailDialog({
  open,
  onOpenChange,
  solicitud,
  compraName,
  almacenName,
  onAprobar,
  onDenegar,
  isResolving = false,
}: SolicitudEntradaDetailDialogProps) {
  const [mode, setMode] = useState<"view" | "aprobar" | "denegar">("view");
  const [observaciones, setObservaciones] = useState("");
  const [motivoDenegar, setMotivoDenegar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!solicitud) return null;

  const totalUnidades = solicitud.materiales.reduce((s, m) => s + m.cantidad_total, 0);
  const valorTotal = solicitud.materiales.reduce((s, m) => s + m.cantidad_total * m.costo_unitario, 0);

  const reset = () => {
    setMode("view");
    setObservaciones("");
    setMotivoDenegar("");
    setError(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleAprobar = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onAprobar(solicitud.id, { observaciones_recepcion: observaciones.trim() || undefined });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDenegar = async () => {
    if (!motivoDenegar.trim()) {
      setError("El motivo de denegación es obligatorio.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onDenegar(solicitud.id, { motivo: motivoDenegar.trim() });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo denegar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isResolving || submitting;
  const esPendiente = solicitud.estado === "pendiente";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-blue-100 shrink-0">
                <ClipboardList className="h-4 w-4 text-blue-700" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Solicitud #{solicitud.id.slice(-8)}
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Creada el {formatDate(solicitud.fecha_creacion)}
                  {solicitud.creado_por_ci ? ` por CI ${solicitud.creado_por_ci}` : ""}
                </p>
              </div>
            </div>
            <EstadoBadge estado={solicitud.estado} />
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Metadata */}
          <section className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Compra</p>
              <p className="text-gray-800 font-medium truncate" title={compraName}>
                {compraName ?? <span className="font-mono text-gray-400">{solicitud.compra_id.slice(-8)}</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Almacén destino</p>
              <p className="text-gray-800 font-medium flex items-center gap-1.5 truncate">
                <Warehouse className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                {almacenName ?? <span className="font-mono text-gray-400">{solicitud.almacen_id.slice(-8)}</span>}
              </p>
            </div>
            {solicitud.fecha_resolucion && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Resuelta</p>
                <p className="text-gray-800">
                  {formatDate(solicitud.fecha_resolucion)}
                  {solicitud.aprobado_por_ci ? ` · CI ${solicitud.aprobado_por_ci}` : ""}
                </p>
              </div>
            )}
          </section>

          {/* Estado de resolución */}
          {solicitud.motivo_denegacion && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <p className="text-[10px] uppercase tracking-wide text-red-600 font-medium mb-0.5">Motivo de denegación</p>
              <p className="text-red-800">{solicitud.motivo_denegacion}</p>
            </div>
          )}
          {solicitud.observaciones_recepcion && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-medium mb-0.5">Observaciones de recepción</p>
              <p className="text-emerald-800">{solicitud.observaciones_recepcion}</p>
            </div>
          )}

          {/* Materiales */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-gray-400" />
                Materiales solicitados
              </Label>
              <span className="text-xs text-gray-400">
                {solicitud.materiales.length} ref · {totalUnidades} uds · ${valorTotal.toFixed(2)}
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Cant.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Costo</th>
                    {POOLS.map((pool) => (
                      <th key={pool} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                        {POOL_LABELS[pool]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {solicitud.materiales.map((m, i) => (
                    <tr
                      key={`${m.material_id}-${i}`}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40"
                    >
                      <td className="py-2 px-3">
                        <p className="font-medium text-gray-800 leading-tight">{m.material_nombre}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{m.material_codigo}</p>
                      </td>
                      <td className="py-2 px-3 text-center font-medium text-gray-700">{m.cantidad_total}</td>
                      <td className="py-2 px-3 text-right text-gray-700">${m.costo_unitario.toFixed(2)}</td>
                      {POOLS.map((pool) => (
                        <td key={pool} className="py-2 px-3 text-center text-sm font-mono text-gray-600">
                          {m.split[pool] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {solicitud.estado === "aprobada" && (solicitud.movimientos_generados.length > 0 || solicitud.kardex_generados.length > 0) && (
              <p className="text-xs text-gray-400 mt-2">
                {solicitud.movimientos_generados.length} movimiento{solicitud.movimientos_generados.length !== 1 ? "s" : ""} ·{" "}
                {solicitud.kardex_generados.length} entrada{solicitud.kardex_generados.length !== 1 ? "s" : ""} en kardex
              </p>
            )}
          </section>

          {/* Acciones de aprobación / denegación */}
          {esPendiente && mode === "view" && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                onClick={() => setMode("aprobar")}
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar solicitud
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("denegar")}
                className="flex-1 gap-2 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Denegar
              </Button>
            </div>
          )}

          {esPendiente && mode === "aprobar" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-emerald-800">
                  Observaciones de recepción <span className="text-emerald-600 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Mercancía recibida en buen estado..."
                  rows={2}
                  className="mt-1 bg-white"
                />
              </div>
              <p className="text-xs text-emerald-700">
                Al aprobar se generarán movimientos de entrada por pool y se registrará el costo en el kardex.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setMode("view"); setError(null); }} disabled={busy}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleAprobar} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar aprobación
                </Button>
              </div>
            </div>
          )}

          {esPendiente && mode === "denegar" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-red-800">
                  Motivo de denegación <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  value={motivoDenegar}
                  onChange={(e) => setMotivoDenegar(e.target.value)}
                  placeholder="Ej: Cantidades no coinciden con la factura..."
                  rows={2}
                  className="mt-1 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setMode("view"); setError(null); }} disabled={busy}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleDenegar} disabled={busy || !motivoDenegar.trim()} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar denegación
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
