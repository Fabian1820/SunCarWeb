"use client";

import { Badge } from "@/components/shared/atom/badge";
import type { EstadoSolicitudEnvio, UrgenciaSolicitudEnvio } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

const ESTADO_STYLES: Record<EstadoSolicitudEnvio, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_proceso: "bg-blue-100 text-blue-800 border-blue-200",
  completada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelada: "bg-slate-100 text-slate-700 border-slate-200",
};

const ESTADO_LABEL: Record<EstadoSolicitudEnvio, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export function EstadoSolicitudBadge({ estado }: { estado: EstadoSolicitudEnvio }) {
  return (
    <Badge variant="outline" className={ESTADO_STYLES[estado]}>
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}

export function UrgenciaBadge({ urgencia }: { urgencia: UrgenciaSolicitudEnvio }) {
  if (urgencia !== "alta") return null;
  return (
    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
      Urgente
    </Badge>
  );
}
