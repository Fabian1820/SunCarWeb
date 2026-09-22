import { cn } from "@/lib/utils";
import {
  ETIQUETA_TIPO,
  type TipoTrabajo,
} from "@/lib/types/feats/planificacion/planificacion-types";

/**
 * El tipo de trabajo con su color, para ver de un vistazo qué lleva cada
 * brigada. Las dos instalaciones comparten verde; la que ya está en proceso
 * va con contorno en vez de relleno.
 */
const ESTILO: Record<TipoTrabajo, string> = {
  visita: "bg-blue-50 text-blue-700",
  instalacion_nueva: "bg-emerald-50 text-emerald-800",
  instalacion_en_proceso: "bg-white text-emerald-800 ring-1 ring-inset ring-emerald-700",
  averia: "bg-red-50 text-red-700",
  actualizacion: "bg-amber-50 text-amber-800",
};

export function EtiquetaTipo({
  tipo,
  count,
  className,
}: {
  tipo: TipoTrabajo;
  /** Cuántos trabajos de este tipo, cuando la etiqueta resume un grupo en vez de uno solo. */
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold",
        ESTILO[tipo],
        className,
      )}
    >
      {ETIQUETA_TIPO[tipo]}
      {count !== undefined && <span className="ml-1 opacity-70">· {count}</span>}
    </span>
  );
}
