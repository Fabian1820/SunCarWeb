/**
 * Etiqueta y colores del estado de un vale de salida.
 *
 * `devuelto` es la devolución TOTAL (no queda nada por devolver). La parcial
 * deja el vale en `usado`: se distingue con `tiene_devolucion` (ver
 * `ValeSalidaSummary`), que se pinta como una marca aparte.
 */
export interface ValeEstadoInfo {
  label: string;
  className: string;
}

export function getValeEstadoInfo(estado?: string): ValeEstadoInfo {
  if (estado === "anulado") {
    return {
      label: "Anulado",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (estado === "devuelto") {
    return {
      label: "Devuelto",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    label: "Usado",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}

export const DEVOLUCION_PARCIAL_CLASS =
  "bg-orange-50 text-orange-700 border-orange-200";

/** Un vale usado con alguna devolución: el estado no lo dice, hay que marcarlo. */
export function esDevolucionParcial(
  estado: string | undefined,
  tieneDevolucion: boolean | undefined,
): boolean {
  return Boolean(tieneDevolucion) && estado !== "anulado" && estado !== "devuelto";
}
