"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Pencil,
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
  type PendienteCosteoMaterial,
  type SolicitudEntradaAlmacen,
} from "@/lib/types/feats/solicitudes-entrada-almacen/solicitud-entrada-almacen-types";
import { useMaterials } from "@/hooks/use-materials";

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
  /**
   * Solo aplica cuando la solicitud está pendiente. Si se pasa, se muestra
   * un botón "Editar" que delega al caller (el caller abre el modal de
   * edición). El dialog se cierra al hacer click.
   */
  onEdit?: (solicitud: SolicitudEntradaAlmacen) => void;
  isResolving?: boolean;
}

export function SolicitudEntradaDetailDialog({
  open,
  onOpenChange,
  solicitud,
  compraName,
  almacenName,
  onEdit,
  onAprobar,
  onDenegar,
  isResolving = false,
}: SolicitudEntradaDetailDialogProps) {
  const [mode, setMode] = useState<"view" | "aprobar" | "denegar">("view");
  const [observaciones, setObservaciones] = useState("");
  const [motivoDenegar, setMotivoDenegar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendientesError, setPendientesError] = useState<PendienteCosteoMaterial[] | null>(null);

  const { materials } = useMaterials();

  if (!solicitud) return null;

  const totalUnidades = solicitud.materiales.reduce((s, m) => s + m.cantidad_total, 0);

  const reset = () => {
    setMode("view");
    setObservaciones("");
    setMotivoDenegar("");
    setError(null);
    setPendientesError(null);
  };

  const handleClose = (open: boolean) => {
    // Mientras se está aprobando o denegando, ignorar intentos de cerrar
    // (click fuera, ESC). Sino el dialog desaparece a mitad del await y deja
    // el state local huérfano.
    if (!open && (isResolving || submitting)) return;
    if (!open) reset();
    onOpenChange(open);
  };

  const handleAprobar = async () => {
    setError(null);
    setPendientesError(null);
    setSubmitting(true);
    try {
      await onAprobar(solicitud.id, { observaciones_recepcion: observaciones.trim() || undefined });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      if (e?.isPendienteCosteo && Array.isArray(e?.materialesBloqueados)) {
        setPendientesError(e.materialesBloqueados);
      } else {
        setError(e instanceof Error ? e.message : "No se pudo aprobar la solicitud.");
      }
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
                {solicitud.materiales.length} ref · {totalUnidades} uds
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Cant.</th>
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

          {/* Acciones de aprobación / denegación / edición */}
          {esPendiente && mode === "view" && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onEdit(solicitud);
                    onOpenChange(false);
                  }}
                  className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar solicitud
                </Button>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
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
                Al aprobar se generarán movimientos de entrada por sector y se registrará el costo en el kardex.
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

          {/* Error simple */}
          {error && !pendientesError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Error estructurado: materiales pendientes de costeo */}
          {pendientesError && pendientesError.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 overflow-hidden">
              {/* Cabecera */}
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-100 border-b border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <p className="text-sm font-semibold text-amber-900">
                  {pendientesError.length === 1
                    ? "1 material no puede entrar — pendiente de costeo"
                    : `${pendientesError.length} materiales no pueden entrar — pendientes de costeo`}
                </p>
              </div>
              {/* Lista de materiales bloqueados */}
              <div className="divide-y divide-amber-100">
                {pendientesError.map((mat) => {
                  const catalogMat = materials.find(
                    (m) => m.id === mat.material_id || m.codigo?.toString() === mat.material_codigo,
                  );
                  const foto = catalogMat?.foto;
                  return (
                    <div key={mat.material_id} className="flex items-center gap-3 px-4 py-3">
                      {/* Foto o placeholder */}
                      <div className="shrink-0 h-12 w-12 rounded-md bg-white border border-amber-200 overflow-hidden flex items-center justify-center">
                        {foto ? (
                          <img src={foto} alt={mat.material_nombre} className="h-full w-full object-contain" />
                        ) : (
                          <Package className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      {/* Info material */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-amber-700 font-semibold">{mat.material_codigo}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{mat.material_nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sin costear en{" "}
                          <span className="font-medium text-gray-700">{mat.compra_nombre}</span>
                        </p>
                      </div>
                      {/* Enlace a ficha */}
                      {mat.compra_id && (
                        <a
                          href={`/compras/${mat.compra_id}/ficha-costo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 hover:underline bg-white border border-violet-200 rounded-md px-2.5 py-1.5 hover:bg-violet-50 transition-colors"
                        >
                          Ir a ficha
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Pie con instrucción */}
              <div className="px-4 py-2.5 bg-amber-100/60 border-t border-amber-200">
                <p className="text-xs text-amber-800">
                  Abre la ficha de costo de cada compra, completa los precios CIF y usa{" "}
                  <span className="font-semibold">Actualizar costos</span>. Luego vuelve a aprobar esta entrada.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
