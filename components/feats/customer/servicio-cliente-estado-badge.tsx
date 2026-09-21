"use client";

import { Badge } from "@/components/shared/atom/badge";
import type { EstadoServicioCliente } from "@/lib/services/feats/customer/servicios-cliente-service";

const ESTADO_STYLES: Record<EstadoServicioCliente, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_proceso: "bg-blue-100 text-blue-800 border-blue-200",
  terminado: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const ESTADO_LABEL: Record<EstadoServicioCliente, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  terminado: "Terminado",
};

export function ServicioClienteEstadoBadge({ estado }: { estado: EstadoServicioCliente }) {
  return (
    <Badge variant="outline" className={ESTADO_STYLES[estado]}>
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}
