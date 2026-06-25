"use client";

import { Pencil } from "lucide-react";
import type { Pago } from "@/lib/services/feats/pagos/pago-service";

interface PagoTrazabilidadProps {
  pago: Pick<
    Pago,
    | "editado_por"
    | "editado_por_nombre"
    | "fecha_creacion"
    | "fecha_actualizacion"
  >;
  className?: string;
}

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Indica si un pago tiene trazabilidad de edición registrada.
 */
const fueEditado = (pago: PagoTrazabilidadProps["pago"]): boolean => {
  if (pago.editado_por || pago.editado_por_nombre) return true;
  // Fallback: fecha_actualizacion distinta (y posterior) a fecha_creacion
  if (pago.fecha_actualizacion && pago.fecha_creacion) {
    const actualizacion = new Date(pago.fecha_actualizacion).getTime();
    const creacion = new Date(pago.fecha_creacion).getTime();
    if (
      Number.isFinite(actualizacion) &&
      Number.isFinite(creacion) &&
      actualizacion - creacion > 1000
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Muestra de forma compacta quién editó un cobro y cuándo, cuando aplica.
 */
export function PagoTrazabilidad({ pago, className }: PagoTrazabilidadProps) {
  if (!fueEditado(pago)) return null;

  const autor =
    pago.editado_por_nombre || pago.editado_por || "usuario no identificado";

  return (
    <div
      className={`flex items-center gap-1 text-[11px] text-amber-700 ${className ?? ""}`}
      title={`Cobro editado por ${autor}`}
    >
      <Pencil className="h-3 w-3 shrink-0" />
      <span>
        Editado por <span className="font-medium">{autor}</span>
        {pago.fecha_actualizacion && (
          <> · {formatDateTime(pago.fecha_actualizacion)}</>
        )}
      </span>
    </div>
  );
}
