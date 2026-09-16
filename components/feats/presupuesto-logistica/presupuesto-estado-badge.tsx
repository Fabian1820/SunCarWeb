import { Badge } from "@/components/shared/atom/badge";
import { cn } from "@/lib/utils";
import {
  ESTADO_PRESUPUESTO_LABEL,
  type EstadoPresupuesto,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

const ESTILOS: Record<EstadoPresupuesto, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  enviada: "bg-amber-100 text-amber-800 border-amber-200",
  devuelta: "bg-orange-100 text-orange-800 border-orange-200",
  aprobada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  anulada: "bg-rose-100 text-rose-800 border-rose-200",
};

export function PresupuestoEstadoBadge({
  estado,
  className,
}: {
  estado: EstadoPresupuesto;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(ESTILOS[estado], className)}>
      {ESTADO_PRESUPUESTO_LABEL[estado]}
    </Badge>
  );
}
