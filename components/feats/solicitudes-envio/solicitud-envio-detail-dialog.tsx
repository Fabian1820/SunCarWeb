"use client";

import Link from "next/link";
import { Package } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { MaterialImage } from "@/components/shared/molecule/material-image";
import type { SolicitudEnvio } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";
import {
  EstadoSolicitudBadge,
  UrgenciaBadge,
} from "@/components/feats/solicitudes-envio/estado-badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudEnvio | null;
  actions?: React.ReactNode;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SolicitudEnvioDetailDialog({
  open,
  onOpenChange,
  solicitud,
  actions,
}: Props) {
  if (!solicitud) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {solicitud.codigo}
              </DialogTitle>
              <DialogDescription>
                {solicitud.materiales.length === 1
                  ? "1 material"
                  : `${solicitud.materiales.length} materiales`}
                {" · "}
                Creada {fmtDate(solicitud.creada_en)}
                {solicitud.creada_por_ci ? ` por ${solicitud.creada_por_ci}` : ""}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <UrgenciaBadge urgencia={solicitud.urgencia} />
              <EstadoSolicitudBadge estado={solicitud.estado} />
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wide">
              Almacén
            </div>
            <div>{solicitud.almacen_id || "Genérico (stock general)"}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wide">
              Urgencia
            </div>
            <div className="capitalize">{solicitud.urgencia}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wide">
              Procesada por
            </div>
            <div>
              {solicitud.procesada_por_ci || "—"}
              <span className="text-slate-500 text-xs ml-2">
                {solicitud.procesada_en ? fmtDate(solicitud.procesada_en) : ""}
              </span>
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wide">
              Compra generada
            </div>
            <div>
              {solicitud.compra_id ? (
                <Link
                  href={`/compras/${solicitud.compra_id}/ficha-costo`}
                  className="text-blue-700 underline"
                >
                  Ver compra
                </Link>
              ) : (
                "—"
              )}
            </div>
          </div>
          {solicitud.notas && (
            <div className="col-span-2">
              <div className="text-slate-500 text-xs uppercase tracking-wide">
                Notas del comprador local
              </div>
              <div className="whitespace-pre-wrap">{solicitud.notas}</div>
            </div>
          )}
          {solicitud.notas_internacional && (
            <div className="col-span-2">
              <div className="text-slate-500 text-xs uppercase tracking-wide">
                Notas de la compradora internacional
              </div>
              <div className="whitespace-pre-wrap">
                {solicitud.notas_internacional}
              </div>
            </div>
          )}
          {solicitud.estado === "cancelada" && (
            <div className="col-span-2">
              <div className="text-slate-500 text-xs uppercase tracking-wide">
                Motivo cancelación
              </div>
              <div>
                {solicitud.motivo_cancelacion || "—"}
                <span className="text-slate-500 text-xs ml-2">
                  {solicitud.cancelada_en ? fmtDate(solicitud.cancelada_en) : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Materiales</div>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            {solicitud.materiales.map((m) => (
              <div key={m.material_id} className="flex items-start gap-3 p-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                  <MaterialImage
                    foto={m.material_foto}
                    fotoDisponible={true}
                    alt={m.material_nombre}
                    imgClassName="w-full h-full object-contain p-1"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-amber-50">
                        <Package className="h-6 w-6 text-amber-700" />
                      </div>
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {m.material_nombre}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {m.material_codigo}
                    {m.um ? ` · ${m.um}` : ""}
                  </div>
                  {m.motivo && (
                    <div className="text-xs text-amber-700 mt-0.5">
                      {m.motivo}
                    </div>
                  )}
                  {(m.cantidad_actual_snapshot != null ||
                    m.stockaje_minimo_snapshot != null) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Al pedir: stock {m.cantidad_actual_snapshot ?? "—"} · mínimo{" "}
                      {m.stockaje_minimo_snapshot ?? "—"}
                    </div>
                  )}
                  {m.notas && (
                    <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                      {m.notas}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold text-slate-900">
                    {m.cantidad}
                  </div>
                  <div className="text-xs text-slate-500">{m.um || ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {actions}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
